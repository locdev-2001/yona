<?php

namespace App\Modules\Integration\Chat\ZaloPersonal;

use App\Exceptions\QuotaExceededException;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ZaloConnection;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\RateCapException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\SendOutsideWindowException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloCircuitOpenException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloNotConnectedException;
use App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloSplitBrainException;
use App\Services\MeteringService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

/**
 * F3/F8 — Gửi tin outbound qua Zalo cá nhân bridge.
 *
 * Thứ tự kiểm tra TRƯỚC khi gửi:
 *   1. Circuit-breaker (ZaloHealthMonitor) → ZaloCircuitOpenException
 *   2. MeteringService quota (assertCanSend)
 *   3. SendRateLimiter (7h-22h + cap ≤3 QC/số/ngày) → throw
 *   4. HTTP → bridge /personal-messages/send (retry 2×200ms)
 *   5. Ghi Message direction=out → meterReply → increment rate limiter
 *
 * Lỗi bridge:
 *   - 503 / not_logged_in → ZaloNotConnectedException (ghi health monitor)
 *   - 429 / 403 → ghi ZaloHealthMonitor + throw ZaloNotConnectedException
 *   - timeout → ZaloNotConnectedException (KHÔNG ghi Message)
 */
class ZaloSendService
{
    public function __construct(
        private readonly SendRateLimiter $rateLimiter,
        private readonly ZaloHealthMonitor $healthMonitor,
        private readonly MeteringService $meteringService,
    ) {}

    /**
     * Gửi tin outbound. Ghi Message chỉ khi bridge confirm ok.
     *
     * @param  string|null  $text  Nội dung text
     * @param  array<string, mixed>|null  $media  {file_url, media_kind, filename}
     *
     * @throws ZaloCircuitOpenException circuit breaker OPEN
     * @throws QuotaExceededException hết quota hội thoại mới
     * @throws SendOutsideWindowException ngoài 7h-22h
     * @throws RateCapException >3 tin/số/ngày
     * @throws ZaloNotConnectedException bridge lỗi / session hết
     */
    public function send(Conversation $conversation, ?string $text, ?array $media = null): Message
    {
        $connection = $this->resolveConnection($conversation);

        // 1. Circuit-breaker check — fail fast trước mọi thứ
        if ($this->healthMonitor->isCircuitOpen((string) $connection->connection_id)) {
            throw new ZaloCircuitOpenException;
        }

        // 2. Metering (quota) — assertCanSend throw QuotaExceededException nếu hết quota.
        // Billing là CORE luôn on: throw khi conv mới kỳ này + hết quota.
        $this->meteringService->assertCanSend($conversation);

        // 3. Rate limiter (ToS Zalo)
        $targetNumber = $conversation->peer_phone ?? $conversation->peer_uid;
        $this->rateLimiter->assertCanSend($conversation->workspace_id, $targetNumber);

        // 4. HTTP → bridge
        $responseData = $this->callBridge($connection, $conversation, $text, $media);

        // 5. Ghi Message + meter
        $message = $this->persistMessage($conversation, $text, $media, $responseData);
        $this->meteringService->meterReply($conversation);
        $this->rateLimiter->increment($conversation->workspace_id, $targetNumber);

        // Reset circuit nếu gửi thành công
        $this->healthMonitor->reset((string) $connection->connection_id);

        return $message;
    }

    /**
     * @param  array<string, mixed>|null  $media
     * @return array<string, mixed>
     *
     * @throws ZaloNotConnectedException
     */
    private function callBridge(ZaloConnection $connection, Conversation $conversation, ?string $text, ?array $media): array
    {
        $payload = [
            'connection_id' => $connection->connection_id,
            'thread_id' => $conversation->peer_uid,
            'thread_type' => $conversation->thread_type,
            'text' => $text,
        ];

        if ($media) {
            $payload['file_url'] = $media['file_url'] ?? null;
            $payload['media_kind'] = $media['media_kind'] ?? null;
            $payload['filename'] = $media['filename'] ?? null;
        }

        $connectionId = (string) $connection->connection_id;

        try {
            $response = Http::asJson()
                ->withHeader('X-Bridge-Send-Secret', config('services.zalo_bridge.send_secret', ''))
                ->timeout(15)
                ->retry(2, 200, throw: false)
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
     */
    private function persistMessage(Conversation $conversation, ?string $text, ?array $media, array $bridgeResponse): Message
    {
        $mediaMeta = [];
        if ($media) {
            $mediaMeta = array_filter([
                'file_url' => $media['file_url'] ?? null,
                'media_kind' => $media['media_kind'] ?? null,
                'filename' => $media['filename'] ?? null,
            ]);
        }

        return Message::create([
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'direction' => 'out',
            'type' => $media ? ($media['media_kind'] ?? 'file') : 'text',
            'body' => $text,
            'media_url' => $media['file_url'] ?? null,
            'media_meta' => $mediaMeta ?: [],
            'source_id' => isset($bridgeResponse['source_id']) ? (string) $bridgeResponse['source_id'] : null,
            'platform_sent_at' => now(),
            'sent_by' => Auth::id(),
        ]);
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
}
