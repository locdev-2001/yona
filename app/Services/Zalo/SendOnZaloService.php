<?php

namespace App\Services\Zalo;

use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Attachment;
use App\Models\Channel\Zalo;
use App\Models\Message;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Messages\Forwarding\MessageForwarder;
use App\Services\Messages\OutboundMentionsBuilder;
use Illuminate\Support\Facades\Log;

/**
 * Gửi tin ra Zalo cá nhân qua bridge. Port từ ZaloSendService của nhánh `main`,
 * đặt lại trên khung BaseSendOnChannelService để SendReplyJob gọi như mọi kênh khác.
 *
 * Một tin của lõi có thể thành NHIỀU lượt gọi bridge (mỗi đính kèm một lượt, vì
 * zca chỉ nhận một tệp mỗi lần gửi). Mọi msgId bridge trả về được gom vào
 * `content_attributes.external_source_ids`; phần đầu tiên là `source_id` chính.
 * Hợp đồng này là thứ IncomingMessageService dùng để dedupe tin dội lại.
 *
 * Lỗi ghi vào `content_attributes.external_error = {code, message}` qua
 * ChannelMessageStatus (docs/channel-capabilities.md §2.2 `outbound_retry`) —
 * `code` ổn định cho UI, `message` đã dịch theo locale của tài khoản.
 */
class SendOnZaloService extends BaseSendOnChannelService
{
    public const ERROR_CIRCUIT_OPEN = 'circuit_open';

    public const ERROR_SESSION_LOST = 'session_lost';

    public const ERROR_BRIDGE_UNREACHABLE = 'bridge_unreachable';

    public const ERROR_SECRET_MISMATCH = 'secret_mismatch';

    public const ERROR_ZALO_REJECTED = 'zalo_rejected';

    public const ERROR_MEDIA_FETCH_FAILED = 'media_fetch_failed';

    public const ERROR_UNKNOWN = 'unknown';

    /**
     * CHỈ lỗi do Zalo thật sự từ chối mới mở ngắt mạch. Lỗi cấu hình (secret) hay
     * hạ tầng của mình không được làm khoá đường gửi của tenant.
     * ZaloHealthMonitor vẫn đếm theo nhãn cũ nên map một lần tại đây.
     *
     * @var array<string, string>
     */
    private const CIRCUIT_ERROR_TYPES = [
        self::ERROR_SESSION_LOST => 'session_lost',
        self::ERROR_ZALO_REJECTED => '429',
    ];

    /** Lỗi tải media của bridge (services/zalo-bridge/src/media-fetch.mjs). */
    private const MEDIA_FETCH_ERRORS = ['download_failed_', 'download_too_large', 'fetch_host_not_allowed', 'fetch_scheme_not_allowed'];

    /** media_kind bridge chấp nhận (services/zalo-bridge/src/index.mjs). */
    private const SENDABLE_MEDIA_KINDS = ['image', 'audio', 'video', 'file'];

    /** Ảnh GIF đi đường `chat.gif` của Zalo (giữ cỡ, chạy hoạt ảnh) thay vì ảnh chụp. */
    private const GIF_MEDIA_KIND = 'gif';

    private const GIF_CONTENT_TYPE = 'image/gif';

    /** SendMessageQuote của zca — thiếu trường nhận dạng thì gửi không trích dẫn. */
    private const QUOTE_REQUIRED_FIELDS = ['msgId', 'cliMsgId', 'uidFrom', 'msgType', 'ts', 'content'];

    private const UNQUOTABLE_MSG_TYPES = ['group.poll'];

    private const WEBCHAT_MSG_TYPE = 'webchat';

    /** Một dòng log mỗi lượt gửi, đọc cùng dòng `[zalo-bridge:send-timing]` của bridge theo message_id. */
    private const TIMING_LOG = 'zalo.send.timing';

    /** @var list<array{media_kind: string, bytes: int|null, bridge_ms: int}> */
    private array $partTimings = [];

    protected function channelClass(): string
    {
        return Zalo::class;
    }

    protected function performReply(): void
    {
        /** @var Zalo $channel */
        $channel = $this->channel();
        $monitor = app(ZaloHealthMonitor::class);
        $queueWaitMs = $this->queueWaitMs();
        $startedAt = hrtime(true);

        $failure = $this->circuitOrSessionFailure($channel, $monitor) ?? $this->sendEveryPart($channel, $monitor);
        $this->logSendTiming($queueWaitMs, $startedAt, $failure);

        if ($failure !== null) {
            ChannelMessageStatus::fail($this->message, $failure);

            return;
        }

        $this->countProactiveMessage($channel);
        $monitor->reset($channel->connectionId());
    }

    /** @return array{code: string, message: string}|null */
    private function circuitOrSessionFailure(Zalo $channel, ZaloHealthMonitor $monitor): ?array
    {
        if ($monitor->isCircuitOpen($channel->connectionId())) {
            return $this->failure(self::ERROR_CIRCUIT_OPEN);
        }

        if (! $channel->isConnected()) {
            return $this->failure(self::ERROR_SESSION_LOST);
        }

        return null;
    }

    /**
     * Gửi lần lượt từng phần; dừng ngay khi một phần hỏng nhưng vẫn giữ mọi
     * source_id đã gửi được (tin nửa vời phải dedupe được echo của nửa đã đi).
     *
     * @return array{code: string, message: string}|null
     */
    private function sendEveryPart(Zalo $channel, ZaloHealthMonitor $monitor): ?array
    {
        $sourceIds = [];
        $failure = null;

        foreach ($this->messageParts($channel) as $part) {
            $callStartedAt = hrtime(true);
            $outcome = $this->callBridge($channel, $monitor, $part['payload']);
            $this->partTimings[] = [
                'media_kind' => (string) ($part['payload']['media_kind'] ?? 'text'),
                'bytes' => $part['bytes'],
                'bridge_ms' => self::elapsedMs($callStartedAt),
            ];
            $sourceIds = [...$sourceIds, ...$outcome['source_ids']];

            // Ghi bí danh NGAY sau mỗi phần, trước khi gửi phần kế: echo của phần
            // vừa đi có thể về trước lúc vòng lặp kết thúc, và chiều vào chỉ dedupe
            // được khi msgId đó đã nằm trong `external_source_ids`
            // (`g1-inbound-evidence.md` §7 — tin ma 884).
            $this->rememberSourceIds($outcome['source_ids']);

            if ($outcome['failure'] !== null) {
                $failure = $this->nameFailingFile($outcome['failure'], $part['filename']);
                break;
            }
        }

        $this->absorbEchoDuplicates($sourceIds);

        return $failure;
    }

    /**
     * Chốt sau khi gửi: echo về sớm hơn lượt ghi bí danh vẫn có thể đã dựng được
     * một tin trùng. Gộp nó vào tin gốc — giữ biểu cảm khách đã thả, chỉ nhận
     * đính kèm khi tin gốc chưa có tệp nào — rồi xoá hẳn bản ghi thừa.
     * Không có tin ma thì đây là một truy vấn rỗng (idempotent, gọi lại vô hại).
     *
     * @param  list<string>  $sourceIds
     */
    private function absorbEchoDuplicates(array $sourceIds): void
    {
        $sourceIds = array_values(array_unique($sourceIds));

        if ($sourceIds === []) {
            return;
        }

        $duplicates = Message::query()
            ->where('inbox_id', $this->message->inbox_id)
            ->whereKeyNot($this->message->getKey())
            ->whereIn('source_id', $sourceIds)
            ->get();

        foreach ($duplicates as $duplicate) {
            $this->absorb($duplicate);
        }
    }

    private function absorb(Message $duplicate): void
    {
        foreach ($duplicate->reactionList() as $reaction) {
            $this->message->setReaction($reaction['by'], $reaction['emoji']);
        }

        // Hook `deleting` của Message xoá đính kèm theo quan hệ đã nạp — dời xong
        // phải rỗng quan hệ đó, nếu không tệp vừa dời sẽ bị xoá khỏi đĩa luôn.
        if ($this->message->attachments()->count() === 0 && $duplicate->attachments()->count() > 0) {
            $duplicate->attachments()->update(['attachable_id' => $this->message->getKey()]);
        }

        $duplicate->setRelation('attachments', $duplicate->attachments()->getRelated()->newCollection());
        $duplicate->delete();
    }

    /**
     * Một phần = một lượt gọi bridge. Sticker của Zalo đi lệnh sticker riêng (sticker
     * nguồn khác đi như ảnh qua đính kèm của nó); tin chữ chuyển tiếp trong
     * cùng phiên đi lệnh chuyển tiếp gốc; tin có đính kèm thì mỗi tệp một phần, chú
     * thích + trích dẫn + nhắc tên bám vào tệp đầu tiên (zca gộp caption vào chính
     * tin đính kèm).
     *
     * @return list<array{payload: array<string, mixed>, filename: string|null}>
     */
    private function messageParts(Zalo $channel): array
    {
        $thread = [
            'message_id' => $this->message->getKey(),
            'connection_id' => $channel->connectionId(),
            'thread_id' => $channel->threadId($this->message),
            'thread_type' => $channel->threadType($this->message),
        ];

        $sticker = $this->nativeSticker();

        if ($sticker !== null) {
            return [$this->part([...$thread, 'sticker' => $sticker])];
        }

        $attachments = $this->sendableAttachments();
        $nativeForward = $attachments === [] ? $this->nativeForwardReference($channel) : null;
        $plan = app(DeliveryPlanner::class)->plan($this->message, $channel->capabilities());
        // Zalo cá nhân không có chip/nút: tin có lựa chọn hạ xuống chữ kèm danh sách đánh số.
        $text = $plan->plainText() ?? $this->message->outgoingContent();

        if ($nativeForward !== null) {
            return [$this->part([...$thread, 'text' => $text, 'forward' => $nativeForward])];
        }

        // 6b: mức image_text (không có tệp đính kèm thật) — gửi ảnh thẻ (satori) như
        // MỘT đính kèm mang chữ, cùng khuôn với nhánh đính kèm thật bên dưới (Zalo
        // không có khung thẻ riêng để vẽ tiêu đề/giá/nút).
        if ($attachments === [] && $plan->imageUrl() !== null) {
            return [$this->part([
                ...$thread,
                'text' => $text,
                'quote' => $this->quotePayload(),
                'mentions' => $this->mentionsPayload($channel, $text),
                'file_url' => $plan->imageUrl(),
                'media_kind' => 'image',
                'filename' => 'the.png',
                'content_type' => 'image/png',
            ])];
        }

        if ($attachments === []) {
            return [$this->part([
                ...$thread,
                'text' => $text,
                'quote' => $this->quotePayload(),
                'mentions' => $this->mentionsPayload($channel, $text),
            ])];
        }

        $parts = [];

        foreach ($attachments as $index => $attachment) {
            $parts[] = $this->part([
                ...$thread,
                'text' => $index === 0 ? $text : null,
                'quote' => $index === 0 ? $this->quotePayload() : null,
                'mentions' => $index === 0 ? $this->mentionsPayload($channel, $text) : null,
                'file_url' => $this->attachmentUrl($attachment),
                'media_kind' => $this->mediaKind($attachment),
                // Không gửi hai trường này thì khách nhận `zbr-<uuid>.bin` (bridge tự đặt tên tạm).
                'filename' => $attachment->filename,
                'content_type' => $attachment->content_type,
            ], $attachment);
        }

        return $parts;
    }

    /**
     * Payload sticker chỉ đi lệnh sticker của Zalo khi danh mục Zalo nhận ra nó;
     * mã của nguồn khác gửi vào đây sẽ thành sticker sai hoặc bị Zalo từ chối.
     *
     * @return array<string, mixed>|null
     */
    private function nativeSticker(): ?array
    {
        $sticker = $this->message->content_attributes['sticker'] ?? null;

        return is_array($sticker) && app(ZaloStickerCatalog::class)->fromStored($sticker) !== null ? $sticker : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{payload: array<string, mixed>, filename: string|null, bytes: int|null}
     */
    private function part(array $payload, ?Attachment $attachment = null): array
    {
        return [
            'payload' => array_filter($payload, fn ($value) => $value !== null && $value !== ''),
            'filename' => $attachment?->filename,
            'bytes' => $attachment?->byte_size,
        ];
    }

    /**
     * Thời gian từng chặng của một lượt gửi: chờ trong hàng đợi (từ lúc tin được
     * lưu tới lúc job chạy), rồi mỗi lượt gọi bridge (bridge tải tệp + Zalo nhận).
     *
     * @param  array{code: string, message: string}|null  $failure
     */
    private function logSendTiming(?int $queueWaitMs, int $startedAt, ?array $failure): void
    {
        Log::info(self::TIMING_LOG, [
            'message_id' => $this->message->getKey(),
            'queue_wait_ms' => $queueWaitMs,
            'parts' => $this->partTimings,
            'total_ms' => self::elapsedMs($startedAt),
            'failure' => $failure['code'] ?? null,
        ]);
    }

    private function queueWaitMs(): ?int
    {
        $createdAt = $this->message->created_at;

        return $createdAt === null ? null : (int) round(now()->getPreciseTimestamp(3) - $createdAt->getPreciseTimestamp(3));
    }

    private static function elapsedMs(int $sinceNanoseconds): int
    {
        return (int) round((hrtime(true) - $sinceNanoseconds) / 1_000_000);
    }

    /**
     * Chỉ đính kèm MANG TỆP mới gửi ra được (bridge nhận media_kind trong
     * image/gif/video/audio/file); location/fallback là dữ liệu hiển thị của lõi.
     *
     * @return list<Attachment>
     */
    private function sendableAttachments(): array
    {
        return $this->message->attachments()
            ->orderBy('id')
            ->get()
            ->filter(fn (Attachment $attachment) => in_array($attachment->fileTypeName(), self::SENDABLE_MEDIA_KINDS, true)
                && filled($this->attachmentUrl($attachment)))
            ->values()
            ->all();
    }

    private function mediaKind(Attachment $attachment): string
    {
        return $attachment->isImage() && $attachment->content_type === self::GIF_CONTENT_TYPE
            ? self::GIF_MEDIA_KIND
            : $attachment->fileTypeName();
    }

    /** Tệp đã lưu trên đĩa là nguồn chính; đính kèm chỉ có URL ngoài vẫn phải được gửi, không im lặng bỏ. */
    private function attachmentUrl(Attachment $attachment): string
    {
        $downloadUrl = $attachment->downloadUrl();

        return $downloadUrl !== '' ? $downloadUrl : (string) $attachment->external_url;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{source_ids: list<string>, failure: array{code: string, message: string}|null}
     */
    private function callBridge(Zalo $channel, ZaloHealthMonitor $monitor, array $payload): array
    {
        $response = app(ZaloBridgeClient::class)->sendMessage($payload, isset($payload['file_url']));

        if ($response === null) {
            return ['source_ids' => [], 'failure' => $this->failure(self::ERROR_BRIDGE_UNREACHABLE)];
        }

        $status = $response->status();
        $body = is_array($response->json()) ? $response->json() : [];
        $detail = (string) ($body['message'] ?? $body['error'] ?? "HTTP {$status}");
        $code = $this->classify($status, $body);

        if ($code === null) {
            return ['source_ids' => $this->sourceIdsFrom($body), 'failure' => null];
        }

        if (isset(self::CIRCUIT_ERROR_TYPES[$code])) {
            $monitor->recordError($channel->connectionId(), self::CIRCUIT_ERROR_TYPES[$code]);
        }

        if ($code === self::ERROR_SESSION_LOST) {
            $channel->markState(Zalo::STATE_SESSION_LOST, 'not_logged_in');
        }

        return ['source_ids' => [], 'failure' => $this->failure($code, $detail)];
    }

    /**
     * Tầng lỗi: 503/403 của bridge là kiểm tra SECRET (checkSendSecret trong
     * services/zalo-bridge/src/index.mjs) — lỗi cấu hình phía mình, tuyệt đối
     * không được hiểu thành mất phiên Zalo. Chỉ `not_logged_in` mới là mất phiên.
     *
     * @param  array<string, mixed>  $body
     */
    private function classify(int $status, array $body): ?string
    {
        $detail = (string) ($body['message'] ?? '');

        if ($detail === 'not_logged_in') {
            return self::ERROR_SESSION_LOST;
        }

        if ($status === 503 || $status === 403) {
            return self::ERROR_SECRET_MISMATCH;
        }

        if ($status === 429) {
            return self::ERROR_ZALO_REJECTED;
        }

        if ($status >= 500) {
            return $this->isMediaFetchError($detail) ? self::ERROR_MEDIA_FETCH_FAILED : self::ERROR_ZALO_REJECTED;
        }

        if ($status >= 400 || ($body['ok'] ?? true) === false) {
            return self::ERROR_UNKNOWN;
        }

        return null;
    }

    private function isMediaFetchError(string $detail): bool
    {
        foreach (self::MEDIA_FETCH_ERRORS as $prefix) {
            if (str_starts_with($detail, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $body
     * @return list<string>
     */
    private function sourceIdsFrom(array $body): array
    {
        $ids = $body['source_ids'] ?? null;

        if (! is_array($ids) || $ids === []) {
            $ids = isset($body['source_id']) ? [$body['source_id']] : [];
        }

        $ids = array_map(fn ($id) => is_scalar($id) ? (string) $id : '', $ids);

        return array_values(array_filter($ids, fn (string $id) => $id !== ''));
    }

    /** @param list<string> $sourceIds */
    private function rememberSourceIds(array $sourceIds): void
    {
        $sourceIds = array_values(array_unique($sourceIds));

        if ($sourceIds === []) {
            return;
        }

        $attributes = $this->message->content_attributes ?? [];
        $known = is_array($attributes['external_source_ids'] ?? null) ? $attributes['external_source_ids'] : [];
        $attributes['external_source_ids'] = array_values(array_unique([...$known, ...$sourceIds]));

        $this->message->update([
            'source_id' => filled($this->message->source_id) ? $this->message->source_id : $sourceIds[0],
            'content_attributes' => $attributes,
        ]);
    }

    /**
     * @param  array{code: string, message: string}  $failure
     * @return array{code: string, message: string}
     */
    private function nameFailingFile(array $failure, ?string $filename): array
    {
        if (blank($filename)) {
            return $failure;
        }

        return [...$failure, 'message' => __('errors.zalo.send.attachment_failed', [
            'filename' => $filename,
            'reason' => $failure['message'],
        ], $this->accountLocale())];
    }

    /** @return array{code: string, message: string} */
    private function failure(string $code, ?string $detail = null): array
    {
        return [
            'code' => $code,
            'message' => __("errors.zalo.send.{$code}", ['detail' => (string) $detail], $this->accountLocale()),
        ];
    }

    private function accountLocale(): ?string
    {
        return $this->inbox()->account->locale;
    }

    /**
     * Trả lời trích dẫn: lõi đã quy `content_attributes.in_reply_to` về id nội bộ
     * (Message#ensureInReplyTo). zca cần nguyên ảnh chụp tin gốc (`SendMessageQuote`),
     * thứ driver đã lưu ở `content_attributes.zca_message` lúc nhận tin. Thiếu
     * trường nhận dạng ⇒ gửi KHÔNG trích dẫn, hơn là gửi trích dẫn hỏng.
     *
     * @return array<string, mixed>|null
     */
    private function quotePayload(): ?array
    {
        $snapshot = $this->message->repliedMessage()?->content_attributes['zca_message'] ?? null;

        if (! is_array($snapshot) || blank($snapshot['msgId'] ?? null)) {
            return null;
        }

        foreach (self::QUOTE_REQUIRED_FIELDS as $field) {
            if (! array_key_exists($field, $snapshot)) {
                return null;
            }
        }

        if (! self::isQuotableByZca($snapshot)) {
            return null;
        }

        return [
            ...array_intersect_key($snapshot, array_flip(self::QUOTE_REQUIRED_FIELDS)),
            'ttl' => $snapshot['ttl'] ?? 0,
            'propertyExt' => $snapshot['propertyExt'] ?? null,
        ];
    }

    /**
     * zca ném lỗi (và làm hỏng CẢ tin trả lời) với hai loại trích dẫn: bình chọn
     * nhóm, và `webchat` mà nội dung không phải chuỗi (node_modules/zca-js/dist/
     * apis/sendMessage.js). Gặp thì gửi không trích dẫn.
     *
     * @param  array<string, mixed>  $snapshot
     */
    private static function isQuotableByZca(array $snapshot): bool
    {
        $msgType = $snapshot['msgType'] ?? null;

        if (in_array($msgType, self::UNQUOTABLE_MSG_TYPES, true)) {
            return false;
        }

        return ! ($msgType === self::WEBCHAT_MSG_TYPE && ! is_string($snapshot['content'] ?? null));
    }

    /**
     * Chuyển tiếp gốc của Zalo: tin chữ chuyển tiếp trong Yona từ một tin nằm trong
     * CHÍNH phiên Zalo này thì gửi bằng lệnh chuyển tiếp để khách thấy nhãn chuyển
     * tiếp như trên app. zca chỉ chuyển tiếp được chữ; thiếu bất kỳ điều kiện nào
     * thì null → gửi lại nội dung như tin thường (bridge cũng tự rơi về khi Zalo từ chối).
     *
     * @return array{msg_id: string, ts: int}|null
     */
    private function nativeForwardReference(Zalo $channel): ?array
    {
        $forwardedFrom = $this->message->content_attributes['forwarded_from'] ?? null;

        if (! is_array($forwardedFrom) || ($forwardedFrom['origin'] ?? null) !== MessageForwarder::ORIGIN_INTERNAL
            || ! is_int($forwardedFrom['message_id'] ?? null) || blank($this->message->content)) {
            return null;
        }

        $source = Message::query()
            ->where('account_id', $this->message->account_id)
            ->find($forwardedFrom['message_id']);
        $sourceChannel = $source?->inbox?->channel;
        $snapshot = $source?->content_attributes['zca_message'] ?? null;

        if (! $sourceChannel instanceof Zalo || $sourceChannel->connectionId() !== $channel->connectionId()
            || ! is_array($snapshot) || blank($snapshot['msgId'] ?? null) || ! is_numeric($snapshot['ts'] ?? null)) {
            return null;
        }

        return ['msg_id' => (string) $snapshot['msgId'], 'ts' => (int) $snapshot['ts']];
    }

    /**
     * Nhắc tên chỉ có nghĩa trong nhóm (zca bỏ qua ở chat 1-1). Lõi đã neo
     * `content_attributes.mentions` theo nội dung cuối, đơn vị UTF-16 — đúng đơn vị
     * `pos`/`len` của zca, nên chỉ đổi tên khoá.
     *
     * @return list<array{uid: string, pos: int, len: int}>|null
     */
    /** Vị trí nhắc tên tính trên chữ THẬT gửi đi — bản gửi đã bỏ cú pháp markdown nên có thể lệch bản lưu. */
    private function mentionsPayload(Zalo $channel, ?string $text): ?array
    {
        $mentions = $this->message->content_attributes['mentions'] ?? null;

        if (! $channel->isGroupThread($this->message->conversation) || ! is_array($mentions)) {
            return null;
        }

        $valid = array_values(array_filter($mentions, static fn ($mention) => is_array($mention)
            && is_scalar($mention['external_id'] ?? null) && is_string($mention['name'] ?? null)
            && is_int($mention['offset'] ?? null) && is_int($mention['length'] ?? null)));

        $payload = [];

        foreach (OutboundMentionsBuilder::reanchor($valid, (string) $this->message->content, (string) $text) as $mention) {
            $payload[] = ['uid' => (string) $mention['external_id'], 'pos' => $mention['offset'], 'len' => $mention['length']];
        }

        return $payload === [] ? null : $payload;
    }

    private function countProactiveMessage(Zalo $channel): void
    {
        if ($this->isReplyInConversationWindow()) {
            return;
        }

        app(SendRateLimiter::class)->increment($channel->account_id, $this->rateLimitTarget());
    }

    /** Số điện thoại là khóa đếm; chưa biết số thì dùng định danh luồng. */
    private function rateLimitTarget(): string
    {
        $phone = $this->contact()->phone_number;

        return blank($phone) ? (string) $this->sourceId() : (string) $phone;
    }

    /**
     * Tin TRẢ LỜI = khách có tin đến trong cửa sổ hội thoại. Từ 07/09/2026 chỉ
     * còn dùng để THỐNG KÊ tin chủ động — founder đã bỏ mọi giới hạn chặn gửi.
     */
    private function isReplyInConversationWindow(): bool
    {
        return Message::query()
            ->where('conversation_id', $this->message->conversation_id)
            ->where('message_type', Message::TYPE_INCOMING)
            ->where('created_at', '>=', now()->subHours((int) config('zalo.reply_window_hours')))
            ->exists();
    }
}
