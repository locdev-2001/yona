<?php

namespace App\Services\Whatsapp;

use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\Events\ReactionEvent;
use App\Messaging\Inbound\Events\ReceiptEvent;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundDirection;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Inbound\MessageEventService;
use App\Messaging\Inbound\ReplyReference;
use App\Messaging\Stickers\StickerContent;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cả hai nhà cung cấp (Cloud API, 360dialog) dùng chung một lõi; khác biệt duy nhất
 * là chỗ bóc `value` khỏi payload — đưa vào processedParams().
 */
class IncomingMessageService
{
    /** @var list<string> Kiểu tin bị bỏ qua. */
    private const UNPROCESSABLE_TYPES = ['ephemeral', 'request_welcome'];

    /** @var array<string, string> kiểu tin mang tệp → loại đính kèm của lõi */
    private const MEDIA_KINDS = [
        'image' => 'image',
        'sticker' => 'image',
        'audio' => 'audio',
        'voice' => 'voice',
        'video' => 'video',
        'document' => 'file',
    ];

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $params,
        private readonly bool $outgoingEcho = false,
    ) {}

    public function perform(): ?Message
    {
        $value = $this->processedParams();

        if (filled($value['statuses'] ?? null)) {
            $this->processStatus((array) $value['statuses'][0]);

            return null;
        }

        $messages = $this->messagesData($value);

        if (blank($messages)) {
            return null;
        }

        return $this->processMessage((array) $messages[0], $value);
    }

    /** @return array<string, mixed> */
    private function processedParams(): array
    {
        // Cloud API bọc trong entry/changes/value; 360dialog gửi phẳng.
        return (array) (data_get($this->params, 'entry.0.changes.0.value') ?? $this->params);
    }

    /**
     * @param  array<string, mixed>  $value
     * @return list<array<string, mixed>>
     */
    private function messagesData(array $value): array
    {
        return (array) ($value['messages'] ?? $value['message_echoes'] ?? []);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $value
     */
    private function processMessage(array $payload, array $value): ?Message
    {
        $type = $payload['type'] ?? null;

        if ($type === 'reaction') {
            $this->applyReaction($payload);

            return null;
        }

        if (in_array($type, self::UNPROCESSABLE_TYPES, true)) {
            return null;
        }

        if (filled($payload['errors'] ?? null)) {
            Log::warning('[WHATSAPP] '.data_get($payload, 'errors.0.title').' - contact: '.($payload['from'] ?? ''));
        }

        $sourceIdentifier = $this->outgoingEcho ? ($payload['to'] ?? null) : ($payload['from'] ?? null);

        if (blank($sourceIdentifier)) {
            return null;
        }

        $sender = new InboundSender(
            sourceId: (string) $sourceIdentifier,
            name: data_get($value, 'contacts.0.profile.name') ?: '+'.$sourceIdentifier,
            phoneNumber: '+'.$sourceIdentifier,
        );

        return app(InboundMessageWriter::class)->write($this->inbox, $sender, $this->inboundMessage($payload, $type));
    }

    /** @param array<string, mixed> $payload */
    private function inboundMessage(array $payload, ?string $type): InboundMessage
    {
        $attachmentPayload = (array) ($payload[$type] ?? []);
        $replyExternalId = data_get($payload, 'context.id');
        $timestamp = $payload['timestamp'] ?? null;

        return new InboundMessage(
            sourceId: (string) $payload['id'],
            direction: $this->outgoingEcho ? InboundDirection::Echo : InboundDirection::Incoming,
            text: $this->messageContent($payload) ?? ($attachmentPayload['caption'] ?? null),
            sentAt: is_numeric($timestamp) ? Carbon::createFromTimestamp((int) $timestamp) : null,
            sticker: $this->sticker($payload, $type),
            attachments: $this->attachments($payload, $type),
            replyTo: filled($replyExternalId) ? new ReplyReference((string) $replyExternalId) : null,
            attributes: array_filter([
                'referral' => ! $this->outgoingEcho && filled($payload['referral'] ?? null) ? $payload['referral'] : null,
            ]),
        );
    }

    /** @param array<string, mixed> $payload */
    private function messageContent(array $payload): ?string
    {
        return data_get($payload, 'text.body')
            ?? data_get($payload, 'button.text')
            ?? data_get($payload, 'interactive.button_reply.title')
            ?? data_get($payload, 'interactive.list_reply.title')
            ?? data_get($payload, 'name.formatted_name');
    }

    /**
     * WhatsApp chỉ trả media id (URL tải cần token) nên không có `url`: ảnh đi qua
     * đính kèm đã tải về.
     *
     * @param  array<string, mixed>  $payload
     */
    private function sticker(array $payload, ?string $type): ?StickerContent
    {
        if ($type !== 'sticker' || blank(data_get($payload, 'sticker.id'))) {
            return null;
        }

        return new StickerContent(
            id: (string) data_get($payload, 'sticker.id'),
            animated: data_get($payload, 'sticker.animated') === null ? null : (bool) data_get($payload, 'sticker.animated'),
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<InboundAttachment>
     */
    private function attachments(array $payload, ?string $type): array
    {
        if ($type === 'location') {
            $location = (array) $payload['location'];
            $title = filled($location['name'] ?? null) ? "{$location['name']}, ".($location['address'] ?? '') : null;

            return [InboundAttachment::location((float) $location['latitude'], (float) $location['longitude'], $title, $location['url'] ?? null)];
        }

        if ($type === 'contacts') {
            return $this->contactCards((array) ($payload['contacts'] ?? []));
        }

        $kind = self::MEDIA_KINDS[$type ?? ''] ?? null;
        $media = (array) ($payload[$type] ?? []);

        if ($kind === null || blank($media['id'] ?? null)) {
            return [];
        }

        return [$this->mediaAttachment((string) $media['id'], AttachmentKind::from($kind), $media['filename'] ?? null)];
    }

    /**
     * Mỗi số điện thoại một danh thiếp, như bản gốc.
     *
     * @param  list<array<string, mixed>>  $contacts
     * @return list<InboundAttachment>
     */
    private function contactCards(array $contacts): array
    {
        $cards = [];

        foreach ($contacts as $contact) {
            $phones = filled($contact['phones'] ?? null) ? $contact['phones'] : [['phone' => 'Phone number is not available']];

            foreach ($phones as $phone) {
                $cards[] = InboundAttachment::contactCard((string) $phone['phone'], [
                    'firstName' => data_get($contact, 'name.first_name'),
                    'lastName' => data_get($contact, 'name.last_name'),
                ]);
            }
        }

        return $cards;
    }

    /**
     * URL media của Graph chỉ mở được kèm bearer token của kênh — không đưa ra trình
     * duyệt; không lấy được URL thì fallback giữ tên tệp để agent biết đã có tệp.
     */
    private function mediaAttachment(string $mediaId, AttachmentKind $kind, ?string $filename): InboundAttachment
    {
        $channel = $this->inbox->channel;
        $mediaUrlResponse = Http::withHeaders($channel->apiHeaders())->get($channel->mediaUrl($mediaId));

        if (! $mediaUrlResponse->successful() || blank($mediaUrlResponse->json('url'))) {
            return InboundAttachment::fallback($filename);
        }

        return InboundAttachment::download((string) $mediaUrlResponse->json('url'), $kind, $filename, headers: $channel->apiHeaders());
    }

    /** @param array<string, mixed> $payload */
    private function applyReaction(array $payload): void
    {
        $targetSourceId = data_get($payload, 'reaction.message_id');

        if (blank($targetSourceId) || blank($payload['from'] ?? null)) {
            return;
        }

        app(MessageEventService::class)->apply($this->inbox, new ReactionEvent(
            targetSourceId: (string) $targetSourceId,
            emoji: data_get($payload, 'reaction.emoji'),
            actor: (string) $payload['from'],
        ));
    }

    /**
     * `delivered`/`read` là biên nhận của lõi; `failed` mang lỗi ngoài; `sent` không
     * đổi gì vì tin đi đã ở trạng thái đó.
     *
     * @param  array<string, mixed>  $status
     */
    private function processStatus(array $status): void
    {
        $sourceId = (string) ($status['id'] ?? '');
        $state = $status['status'] ?? '';

        if ($sourceId === '' || ! array_key_exists($state, Message::STATUSES)) {
            return;
        }

        if ($state === 'delivered' || $state === 'read') {
            app(MessageEventService::class)->apply($this->inbox, $state === 'read' ? ReceiptEvent::read([$sourceId]) : ReceiptEvent::delivered([$sourceId]));

            return;
        }

        $message = Message::query()->where('inbox_id', $this->inbox->id)->where('source_id', $sourceId)->first();

        if ($message === null) {
            return;
        }

        $externalError = $state === 'failed' && filled($status['errors'] ?? null)
            ? data_get($status, 'errors.0.code').': '.data_get($status, 'errors.0.title')
            : null;

        ChannelMessageStatus::markStatus($message, $state, $externalError);
    }
}
