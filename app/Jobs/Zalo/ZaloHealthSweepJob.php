<?php

namespace App\Jobs\Zalo;

use App\Jobs\ApplicationJob;
use App\Models\Channel\Zalo;
use App\Services\Zalo\ZaloBridgeClient;
use App\Services\Zalo\ZaloHealthMonitor;
use App\Services\Zalo\ZaloProfileSync;
use App\Support\Alerts\OpsAlerter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Nhịp tim Laravel ↔ bridge (zalo-deep-audit 6.5). Không có nó, bridge chết là DB
 * vẫn báo "connected": biểu ngữ không hiện, sidebar không có icon, mỗi tin gửi
 * hỏng riêng lẻ và chủ shop không hiểu vì sao.
 *
 * Ngưỡng ba lượt liên tiếp là cố ý: bridge đã tự đăng nhập lại theo backoff
 * (services/zalo-bridge session-resilience) nên một nhịp lỡ KHÔNG được làm hộp
 * thư nhấp nháy đỏ. Hồi lại thì tự đưa về `connected`.
 */
class ZaloHealthSweepJob extends ApplicationJob
{
    public const FAILURE_THRESHOLD = 3;

    public function __construct(private readonly ?int $connectionId = null)
    {
        $this->onQueue('scheduled_jobs');
    }

    public function handle(ZaloBridgeClient $bridge, ZaloHealthMonitor $monitor, ZaloProfileSync $profileSync, OpsAlerter $alerter): void
    {
        $this->channels()->each(function (Zalo $channel) use ($bridge, $monitor, $profileSync, $alerter) {
            $response = $bridge->health($channel);
            $payload = $response !== null && $response->successful() ? (array) $response->json() : null;

            if ($payload !== null && ($payload['connected'] ?? false) === true) {
                $this->markHealthy($channel, $monitor);
                $this->backfillProfile($channel, $payload, $profileSync);

                return;
            }

            $this->markFailing($channel, $monitor, $this->reasonOf($response, $payload), $alerter);
        });
    }

    /** @return Collection<int, Zalo> */
    private function channels()
    {
        return Zalo::query()
            ->when($this->connectionId !== null, fn ($query) => $query->whereKey($this->connectionId))
            ->whereIn('state', [Zalo::STATE_CONNECTED, Zalo::STATE_SESSION_LOST])
            ->get();
    }

    private function markHealthy(Zalo $channel, ZaloHealthMonitor $monitor): void
    {
        $monitor->clearBridgeFailures($channel->connectionId());

        if (! $channel->isConnected()) {
            $monitor->reset($channel->connectionId());
            $channel->markState(Zalo::STATE_CONNECTED);
        }
    }

    /**
     * Hộp thư nối trước khi có bước lưu hồ sơ (promote cũ) không có tên/ảnh tài
     * khoản Zalo — thẻ "Tài khoản Zalo đang kết nối" chỉ hiện chữ cái đầu. Nhịp
     * tim đã cầm sẵn `integrated_display_name`/`integrated_avatar` của bridge nên
     * lấp luôn, và KHÔNG ghi đè thứ đã có (`authoritative: false`).
     *
     * @param  array<string, mixed>  $payload
     */
    private function backfillProfile(Zalo $channel, array $payload, ZaloProfileSync $profileSync): void
    {
        if (! $profileSync->isIncomplete($channel)) {
            return;
        }

        $profileSync->apply($channel, [
            'display_name' => $payload['integrated_display_name'] ?? null,
            'avatar' => $payload['integrated_avatar'] ?? null,
        ], authoritative: false);
    }

    private function markFailing(Zalo $channel, ZaloHealthMonitor $monitor, string $reason, OpsAlerter $alerter): void
    {
        $failures = $monitor->recordBridgeFailure($channel->connectionId());

        if ($failures < self::FAILURE_THRESHOLD || ! $channel->isConnected()) {
            return;
        }

        Log::warning('[ZALO] bridge không phản hồi, hạ trạng thái kênh', [
            'connection_id' => $channel->connectionId(),
            'failures' => $failures,
            'reason' => $reason,
        ]);

        $monitor->recordError($channel->connectionId(), 'session_lost');
        $channel->markState(Zalo::STATE_SESSION_LOST, $reason);

        // 'bridge_down' ảnh hưởng MỌI kênh cùng lúc — monitor:check đã báo bridge chết
        // (docs/deployment.md mục 13), một alert riêng mỗi kênh ở đây chỉ là bão trùng lặp.
        if ($reason === 'bridge_down') {
            return;
        }

        $alerter->send(
            "zalo-session-lost:{$channel->connectionId()}",
            "Kênh Zalo #{$channel->connectionId()} mất phiên đăng nhập (lý do: {$reason}) — cần đăng nhập lại bằng QR.",
        );
    }

    /** @param array<string, mixed>|null $payload */
    private function reasonOf(mixed $response, ?array $payload): string
    {
        if ($response === null) {
            return 'bridge_down';
        }

        if ($payload === null) {
            return 'bridge_error_'.$response->status();
        }

        return is_string($payload['session_lost_reason'] ?? null)
            ? (string) $payload['session_lost_reason']
            : 'bridge_slot_'.(string) ($payload['phase'] ?? 'unknown');
    }
}
