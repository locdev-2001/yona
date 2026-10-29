<?php

namespace App\Services\MessengerPersonal;

use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Attachment;
use App\Models\Channel\MessengerPersonal;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Messages\OutboundMentionsBuilder;

/**
 * Gửi tin ra Messenger cá nhân qua sidecar (`POST /messages/send`). Hợp đồng nhận một
 * tệp mỗi lượt, nên tin có nhiều tệp thành nhiều lượt: chữ đi làm chú thích của tệp đầu
 * cùng trích dẫn, các tệp sau đi riêng. Mọi `source_id` sidecar trả về được gom vào
 * `content_attributes.external_source_ids` (phần đầu là `source_id` chính) để biên nhận,
 * cảm xúc và thu hồi trỏ vào phần nào cũng tìm ra tin.
 *
 * Lỗi ghi `external_error = {code, message}` (năng lực `outbound_retry`).
 */
class SendOnMessengerPersonalService extends BaseSendOnChannelService
{
    public const ERROR_CIRCUIT_OPEN = 'circuit_open';

    public const ERROR_MISSING_CHAT = 'missing_chat';

    /** media.kind sidecar nhận; ảnh GIF đi như ảnh. */
    private const SENDABLE_FILE_TYPES = ['image', 'video', 'audio', 'file'];

    /** Lỗi do phía Meta/phiên mới làm mở ngắt mạch; lỗi cấu hình phía mình thì không. */
    private const CIRCUIT_ERROR_TYPES = [
        BridgeOutcome::SESSION_LOST => 'session_lost',
        BridgeOutcome::REJECTED => '429',
    ];

    private const CARD_IMAGE_FILENAME = 'card.png';

    private const CARD_IMAGE_CONTENT_TYPE = 'image/png';

    /** Mã nguồn của tin do kênh này đặt (`mpe:` mã hoá, `mpr:` thường) — chỉ chúng mới trích dẫn được. */
    private const SOURCE_ID_PREFIX = 'mp';

    protected function channelClass(): string
    {
        return MessengerPersonal::class;
    }

    protected function performReply(): void
    {
        /** @var MessengerPersonal $channel */
        $channel = $this->channel();
        $monitor = app(HealthMonitor::class);
        $failure = $this->precondition($channel, $monitor) ?? $this->sendEveryPart($channel, $monitor);

        if ($failure !== null) {
            ChannelMessageStatus::fail($this->message, $failure);

            return;
        }

        $monitor->reset($channel->connectionId());
    }

    /** @return array{code: string, message: string}|null */
    private function precondition(MessengerPersonal $channel, HealthMonitor $monitor): ?array
    {
        if ($monitor->isCircuitOpen($channel->connectionId())) {
            return $this->failure(self::ERROR_CIRCUIT_OPEN);
        }

        if (! $channel->isConnected()) {
            return $this->failure(BridgeOutcome::SESSION_LOST);
        }

        return $channel->chatOf($this->conversation()) === null ? $this->failure(self::ERROR_MISSING_CHAT) : null;
    }

    /**
     * Dừng ở phần hỏng đầu tiên nhưng vẫn giữ mọi `source_id` đã gửi được.
     *
     * @return array{code: string, message: string}|null
     */
    private function sendEveryPart(MessengerPersonal $channel, HealthMonitor $monitor): ?array
    {
        $bridge = app(BridgeClient::class);

        foreach ($this->parts($channel) as $part) {
            $outcome = BridgeOutcome::fromResponse($bridge->send($part['payload']), $this->accountLocale());

            if ($outcome['ok']) {
                $this->rememberSourceId($outcome['body']['source_id'] ?? null);

                continue;
            }

            return $this->recordFailure($channel, $monitor, $outcome['code'], $outcome['detail'], $part['filename']);
        }

        return null;
    }

    /** @return array{code: string, message: string} */
    private function recordFailure(MessengerPersonal $channel, HealthMonitor $monitor, string $code, string $detail, ?string $filename): array
    {
        if (isset(self::CIRCUIT_ERROR_TYPES[$code])) {
            $monitor->recordError($channel->connectionId(), self::CIRCUIT_ERROR_TYPES[$code]);
        }

        if ($code === BridgeOutcome::SESSION_LOST) {
            $channel->markState(MessengerPersonal::STATE_SESSION_LOST, 'send_session_lost');
        }

        $failure = $this->failure($code, $detail);

        return blank($filename) ? $failure : [...$failure, 'message' => __('errors.messenger_personal.send.attachment_failed', [
            'filename' => $filename,
            'reason' => $failure['message'],
        ], $this->accountLocale())];
    }

    /**
     * @return list<array{payload: array<string, mixed>, filename: string|null}>
     */
    private function parts(MessengerPersonal $channel): array
    {
        $chat = $channel->chatOf($this->conversation());
        $base = [
            'message_id' => $this->message->getKey(),
            'connection_id' => $channel->connectionId(),
            'chat' => $chat?->toArray(),
        ];
        $plan = app(DeliveryPlanner::class)->plan($this->message, $channel->capabilities());
        $text = $plan->plainText() ?? $this->message->outgoingContent();
        $text = filled($text) ? (string) $text : null;
        $replyTo = $this->replyTo();
        $mentions = $chat?->isGroup() === true ? $this->mentions($text) : [];
        $media = $this->mediaItems($plan->imageUrl());

        if ($media === []) {
            return [['payload' => [...$base, 'text' => $text, 'media' => null, 'reply_to' => $replyTo, 'mentions' => $mentions], 'filename' => null]];
        }

        $parts = [];

        foreach ($media as $index => $item) {
            $isFirst = $index === 0;
            $parts[] = [
                'payload' => [
                    ...$base,
                    'text' => $isFirst ? $text : null,
                    'media' => $item,
                    'reply_to' => $isFirst ? $replyTo : null,
                    'mentions' => $isFirst ? $mentions : [],
                ],
                'filename' => $item['filename'],
            ];
        }

        return $parts;
    }

    /**
     * Tệp mang nội dung thật; tin không có tệp nhưng thẻ có ảnh (mức image_text) thì gửi
     * ảnh thẻ.
     *
     * @return list<array{url: string, kind: string, filename: string|null, content_type: string|null}>
     */
    private function mediaItems(?string $cardImageUrl): array
    {
        $items = $this->message->attachments()
            ->orderBy('id')
            ->get()
            ->filter(fn (Attachment $attachment) => in_array($attachment->fileTypeName(), self::SENDABLE_FILE_TYPES, true)
                && filled($this->attachmentUrl($attachment)))
            ->map(fn (Attachment $attachment) => [
                'url' => $this->attachmentUrl($attachment),
                'kind' => $attachment->fileTypeName(),
                'filename' => $attachment->filename,
                'content_type' => $attachment->content_type,
            ])
            ->values()
            ->all();

        if ($items !== [] || $cardImageUrl === null) {
            return $items;
        }

        return [[
            'url' => $cardImageUrl,
            'kind' => 'image',
            'filename' => self::CARD_IMAGE_FILENAME,
            'content_type' => self::CARD_IMAGE_CONTENT_TYPE,
        ]];
    }

    private function attachmentUrl(Attachment $attachment): string
    {
        $downloadUrl = $attachment->downloadUrl();

        return $downloadUrl !== '' ? $downloadUrl : (string) $attachment->external_url;
    }

    /**
     * Lõi đã neo `content_attributes.mentions` theo nội dung lưu (UTF-16); bản gửi đã bỏ
     * cú pháp markdown nên neo lại theo chữ THẬT gửi đi, rồi chỉ đổi `external_id` thành `id`.
     * Mục "nhắc cả nhóm" giữ id trung tính `all` (hợp đồng sidecar dùng đúng id này); lõi
     * chỉ để nó tới đây khi kênh khai `OutboundMentionAll`.
     *
     * @return list<array{id: string, offset: int, length: int}>
     */
    private function mentions(?string $text): array
    {
        $mentions = $this->message->content_attributes['mentions'] ?? null;

        if ($text === null || ! is_array($mentions)) {
            return [];
        }

        $valid = array_values(array_filter($mentions, static fn ($mention) => is_array($mention)
            && is_scalar($mention['external_id'] ?? null)
            && is_string($mention['name'] ?? null) && is_int($mention['offset'] ?? null) && is_int($mention['length'] ?? null)));

        return array_map(static fn (array $mention) => [
            'id' => (string) $mention['external_id'],
            'offset' => $mention['offset'],
            'length' => $mention['length'],
        ], OutboundMentionsBuilder::reanchor($valid, (string) $this->message->content, $text));
    }

    /** Lõi đã quy trích dẫn về tin nội bộ; Messenger chỉ trích được tin có mã của kênh. */
    private function replyTo(): ?string
    {
        $sourceId = $this->message->repliedMessage()?->source_id;

        return is_string($sourceId) && str_starts_with($sourceId, self::SOURCE_ID_PREFIX) ? $sourceId : null;
    }

    private function rememberSourceId(mixed $sourceId): void
    {
        if (! is_string($sourceId) || $sourceId === '') {
            return;
        }

        $attributes = $this->message->content_attributes ?? [];
        $known = is_array($attributes['external_source_ids'] ?? null) ? $attributes['external_source_ids'] : [];
        $attributes['external_source_ids'] = array_values(array_unique([...$known, $sourceId]));

        $this->message->update([
            'source_id' => filled($this->message->source_id) ? $this->message->source_id : $sourceId,
            'content_attributes' => $attributes,
        ]);
    }

    /** @return array{code: string, message: string} */
    private function failure(string $code, ?string $detail = null): array
    {
        return [
            'code' => $code,
            'message' => __("errors.messenger_personal.send.{$code}", ['detail' => (string) $detail], $this->accountLocale()),
        ];
    }

    private function accountLocale(): ?string
    {
        return $this->inbox()->account->locale;
    }
}
