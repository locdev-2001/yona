<?php

namespace App\Modules\Chat\Adapter\ZaloPersonal\Delivery;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageSourceAlias;
use App\Models\ZaloConnection;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\RateCapException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\SendOutsideWindowException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloCircuitOpenException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloNotConnectedException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloSplitBrainException;
use App\Modules\Chat\Adapter\ZaloPersonal\Health\ZaloHealthMonitor;
use App\Modules\Chat\Adapter\ZaloPersonal\Policy\SendRateLimiter;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * F3/F8 — Gửi tin outbound qua Zalo cá nhân bridge.
 *
 * Thứ tự kiểm tra TRƯỚC khi gửi:
 *   1. Circuit-breaker (ZaloHealthMonitor) → ZaloCircuitOpenException
 *   2. (P11) metering ĐÃ hoist lên DeliveryPipeline — driver không meter
 *   3. SendRateLimiter (7h-22h + cap ≤3 QC/số/ngày) → throw
 *   4. HTTP → bridge /personal-messages/send (không retry — send không idempotent)
 *   5. Ghi Message direction=out → increment rate limiter (thống kê Ở PIPELINE)
 *
 * Lỗi bridge:
 *   - 503 / not_logged_in → ZaloNotConnectedException (ghi health monitor)
 *   - 429 / 403 → ghi ZaloHealthMonitor + throw ZaloNotConnectedException
 *   - timeout → ZaloNotConnectedException (KHÔNG ghi Message)
 */
class ZaloSendService
{
    /** Cửa sổ "hội thoại đang hoạt động": khách có inbound trong N giờ → tin gửi là TRẢ LỜI, không phải QC. */
    private const REPLY_WINDOW_HOURS = 24;

    public function __construct(
        private readonly SendRateLimiter $rateLimiter,
        private readonly ZaloHealthMonitor $healthMonitor,
    ) {}

    /**
     * Gửi tin outbound. Ghi Message chỉ khi bridge confirm ok.
     *
     * @param  string|null  $text  Nội dung text
     * @param  array<string, mixed>|null  $media  {file_url, display_url, media_kind, filename, attachment_id}
     * @param  array<string, mixed>|null  $quote  P06a — zca quote object (SendMessageQuote shape từ platform_meta)
     * @param  array<string, mixed>|null  $sticker  P06a — {id, cateId, type, url?, thumbnail?}
     * @param  array<string, mixed>|null  $quoteDisplay  media_meta.quote cho FE render
     *
     * @throws ZaloCircuitOpenException circuit breaker OPEN
     * @throws SendOutsideWindowException ngoài 7h-22h
     * @throws RateCapException >3 tin/số/ngày
     * @throws ZaloNotConnectedException bridge lỗi / session hết
     */
    public function send(
        Conversation $conversation,
        ?string $text,
        ?array $media = null,
        ?array $quote = null,
        ?array $sticker = null,
        ?array $quoteDisplay = null,
    ): Message {
        $connection = $this->resolveConnection($conversation);

        // 1. Circuit-breaker check — fail fast trước mọi thứ
        if ($this->healthMonitor->isCircuitOpen((string) $connection->connection_id)) {
            throw new ZaloCircuitOpenException;
        }

        // P11 (BLK-4): metering KHÔNG còn ở driver — meterReply sống ở
        // DeliveryPipeline (core). Service này = policy Zalo + transport + persist.

        // 2. Rate limiter (ToS Zalo — POLICY kênh) — cap ≤3/ngày CHỈ áp tin CHỦ ĐỘNG (QC).
        // Tin trả lời khi khách có inbound ≤24h không phải QC → miễn cap, không tiêu quota cap.
        $targetNumber = $conversation->senderPhone() ?? $conversation->sender_uid;
        $isReply = $this->isReplyToRecentInbound($conversation);
        $this->rateLimiter->assertCanSend($conversation->workspace_id, $targetNumber, isReply: $isReply);

        // 3. HTTP → bridge (TRANSPORT)
        $responseData = $this->callBridge($connection, $conversation, $text, $media, $quote, $sticker);

        // 4. Ghi Message
        $message = $this->persistMessage($conversation, $text, $media, $responseData, $sticker, $quoteDisplay);

        if (! $isReply) {
            $this->rateLimiter->increment($conversation->workspace_id, $targetNumber);
        }

        // Reset circuit nếu gửi thành công
        $this->healthMonitor->reset((string) $connection->connection_id);

        return $message;
    }

    /**
     * @param  array<string, mixed>|null  $media
     * @param  array<string, mixed>|null  $quote
     * @param  array<string, mixed>|null  $sticker
     * @return array<string, mixed>
     *
     * @throws ZaloNotConnectedException
     */
    private function callBridge(ZaloConnection $connection, Conversation $conversation, ?string $text, ?array $media, ?array $quote = null, ?array $sticker = null): array
    {
        $payload = [
            'connection_id' => $connection->connection_id,
            'thread_id' => $conversation->sender_uid,
            'thread_type' => $conversation->thread_type,
            'text' => $text,
        ];

        if ($media) {
            $payload['file_url'] = $media['file_url'] ?? null;
            $payload['media_kind'] = $media['media_kind'] ?? null;
            $payload['filename'] = $media['filename'] ?? null;
        }

        if ($quote) {
            $payload['quote'] = $quote;
        }

        if ($sticker) {
            $payload['sticker'] = [
                'id' => (int) ($sticker['id'] ?? 0),
                'cateId' => (int) ($sticker['cateId'] ?? $sticker['cate_id'] ?? 0),
                'type' => (int) ($sticker['type'] ?? 1),
            ];
        }

        $connectionId = (string) $connection->connection_id;

        try {
            // Send KHÔNG idempotent — không retry: bridge có thể đã gửi xong sau khi
            // client timeout, retry = gửi trùng tin cho khách. Media chờ dài hơn text
            // vì bridge phải tải file về rồi upload lên CDN Zalo trước khi gửi.
            $response = Http::asJson()
                ->withHeader('X-Bridge-Send-Secret', config('services.zalo_bridge.send_secret', ''))
                ->timeout($media ? 120 : 15)
                ->post(config('services.zalo_bridge.url', 'http://127.0.0.1:3710').'/personal-messages/send', $payload);
        } catch (\Exception $e) {
            // Timeout hoặc connection refused → KHÔNG ghi Message
            throw new ZaloNotConnectedException('Không thể kết nối bridge Zalo: '.$e->getMessage());
        }

        $status = $response->status();
        $body = $response->json() ?? [];

        if ($status === 503 || ($body['message'] ?? '') === 'not_logged_in') {
            $this->healthMonitor->recordError($connectionId, 'session_lost');
            throw new ZaloNotConnectedException('Phiên Zalo đã hết. Vui lòng đăng nhập lại.');
        }

        if ($status === 429) {
            $this->healthMonitor->recordError($connectionId, '429');
            throw new ZaloNotConnectedException('Zalo rate limit (429). Thử lại sau.');
        }

        if ($status === 403) {
            $this->healthMonitor->recordError($connectionId, '403');
            throw new ZaloNotConnectedException('Zalo từ chối (403). Kiểm tra tài khoản.');
        }

        if (! $response->successful()) {
            throw new ZaloNotConnectedException('Bridge lỗi HTTP '.$status.': '.($body['message'] ?? 'unknown'));
        }

        return $body;
    }

    /**
     * @param  array<string, mixed>|null  $media
     * @param  array<string, mixed>  $bridgeResponse
     * @param  array<string, mixed>|null  $sticker
     * @param  array<string, mixed>|null  $quoteDisplay
     */
    private function persistMessage(Conversation $conversation, ?string $text, ?array $media, array $bridgeResponse, ?array $sticker = null, ?array $quoteDisplay = null): Message
    {
        $mediaMeta = [];
        if ($media) {
            // P04: KHÔNG lưu file_url (signed URL transient, hết hạn 15') — media_url
            // dùng display_url bền (route show, quyền = xem conversation).
            $mediaMeta = array_filter([
                'media_kind' => $media['media_kind'] ?? null,
                'media_filename' => $media['filename'] ?? null,
                'attachment_id' => $media['attachment_id'] ?? null,
            ]);
        }
        if ($sticker) {
            // Review LOW-2: url/thumbnail là input client render <img> cho cả workspace
            // → chỉ giữ CDN Zalo (chặn beacon/IP-leak). Sticker vẫn gửi được bằng id.
            $mediaMeta['sticker'] = array_filter([
                'id' => $sticker['id'] ?? null,
                'cateId' => $sticker['cateId'] ?? $sticker['cate_id'] ?? null,
                'type' => $sticker['type'] ?? null,
                'url' => $this->zaloCdnUrlOrNull($sticker['url'] ?? null),
                'thumbnail' => $this->zaloCdnUrlOrNull($sticker['thumbnail'] ?? null),
            ], fn ($v) => $v !== null);
        }
        if ($quoteDisplay) {
            $mediaMeta['quote'] = $quoteDisplay;
        }

        $sourceId = isset($bridgeResponse['source_id']) ? (string) $bridgeResponse['source_id'] : null;

        $attrs = [
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'direction' => 'out',
            'type' => $sticker ? 'sticker' : ($media ? ($media['media_kind'] ?? 'file') : 'text'),
            'body' => $text,
            // Review L1: KHÔNG fallback file_url — signed URL 15' tuyệt đối không được vào DB
            'media_url' => $media !== null ? ($media['display_url'] ?? null) : null,
            'media_meta' => $mediaMeta ?: [],
            'source_id' => $sourceId,
            'platform_sent_at' => now(),
            'sent_by' => Auth::id(),
        ];

        try {
            $message = DB::transaction(fn () => Message::create($attrs));
            $createdNew = true;
        } catch (QueryException $e) {
            // P02 race: echo self-listen về webhook TRƯỚC khi portal persist → row
            // (conversation_id, source_id) đã tồn tại (23505). Tin ĐÃ gửi thành công
            // phía Zalo — không được ném lỗi ra user. Merge phần portal biết
            // (body/media/sent_by) vào row echo. Savepoint (DB::transaction) để
            // connection còn dùng được sau abort — pattern upsertConversation.
            if ($e->getCode() !== '23505' || $sourceId === null) {
                throw $e;
            }

            $message = Message::where('conversation_id', $conversation->id)
                ->where('source_id', $sourceId)
                ->firstOrFail();

            foreach (['body', 'media_url', 'media_meta', 'sent_by'] as $col) {
                $existingValue = $message->{$col};
                if (($existingValue === null || $existingValue === [] || $existingValue === '') && $attrs[$col] !== null) {
                    $message->{$col} = $attrs[$col];
                }
            }
            if ($message->isDirty()) {
                $message->save();
            }
            $createdNew = false;
        }

        // P04 (Codex MED-7): file + caption → zca tách 2 tin → 2 msgId. Bridge trả
        // source_ids đầy đủ; id phụ ghi message_source_aliases để echo thứ hai dedup
        // vào CÙNG row này thay vì tạo tin trùng.
        $allSourceIds = array_map('strval', array_filter((array) ($bridgeResponse['source_ids'] ?? [])));
        foreach (array_unique(array_diff($allSourceIds, [$sourceId ?? ''])) as $aliasSourceId) {
            // Review L5: firstOrCreate — đụng unique (echo về trước) không được ném lỗi
            // ra user khi tin ĐÃ gửi thành công phía Zalo.
            MessageSourceAlias::firstOrCreate(
                ['conversation_id' => $conversation->id, 'source_id' => $aliasSourceId],
                [
                    'workspace_id' => $conversation->workspace_id,
                    'message_id' => $message->id,
                    'kind' => 'multi_send',
                ],
            );
        }

        // P05 invariant: MỌI Message insert mới +1 stream_version (khớp
        // IntakeService::createMessage) — echo bridge về sau chỉ là
        // replay no-op theo source_id, không bump lần hai. Race-merge (echo đã
        // insert + bump trước) → KHÔNG bump lần hai.
        if ($createdNew) {
            Conversation::where('id', $conversation->id)->increment('stream_version');
        }

        return $message;
    }

    /**
     * P03 — core mù session: resolve slot sống của tài khoản (channel_account_id),
     * KHÔNG đọc conversation.zalo_connection_id. Partial unique (P02g) cưỡng chế
     * đúng 1 slot 'connected'/account; 0 hoặc >1 đều fail-closed.
     *
     * @throws ZaloNotConnectedException 0 slot connected
     * @throws ZaloSplitBrainException >1 slot connected (không nên xảy ra — DB partial unique chặn)
     */
    private function resolveConnection(Conversation $conversation): ZaloConnection
    {
        if (! $conversation->channel_account_id) {
            throw new ZaloNotConnectedException('Hội thoại chưa gắn tài khoản Zalo.');
        }

        $slots = ZaloConnection::connectedForAccount($conversation->workspace_id, $conversation->channel_account_id);

        if ($slots->isEmpty()) {
            $accountName = $conversation->channelAccount?->display_name;
            $label = $accountName ? "Tài khoản {$accountName}" : 'Tài khoản Zalo';
            throw new ZaloNotConnectedException("{$label} cần quét lại QR.");
        }

        if ($slots->count() > 1) {
            throw new ZaloSplitBrainException;
        }

        return $slots->first();
    }

    /** Review LOW-2: chỉ nhận URL CDN sticker Zalo (zadn.vn / zdn.vn). */
    private function zaloCdnUrlOrNull(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        foreach (['.zadn.vn', '.zdn.vn'] as $suffix) {
            if (str_ends_with($host, $suffix)) {
                return $url;
            }
        }

        return null;
    }

    /**
     * Tin TRẢ LỜI = khách có inbound trong REPLY_WINDOW_HOURS gần đây — không
     * phải tin QC chủ động nên miễn cap ≤3/ngày (rule "≤3 tin QC/số/ngày").
     * Anchor theo created_at (lúc hệ thống nhận) — index conversation_id thu hẹp đủ rẻ.
     */
    private function isReplyToRecentInbound(Conversation $conversation): bool
    {
        return Message::where('conversation_id', $conversation->id)
            ->where('direction', 'in')
            ->where('created_at', '>=', now()->subHours(self::REPLY_WINDOW_HOURS))
            ->exists();
    }
}
