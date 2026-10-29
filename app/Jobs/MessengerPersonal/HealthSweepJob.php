<?php

namespace App\Jobs\MessengerPersonal;

use App\Jobs\ApplicationJob;
use App\Models\Channel\MessengerPersonal;
use App\Services\MessengerPersonal\BridgeClient;
use App\Services\MessengerPersonal\HealthMonitor;
use App\Support\Alerts\OpsAlerter;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Nhịp tim Laravel ↔ sidecar Messenger mỗi phút. Không có nó, sidecar chết là DB vẫn
 * báo "connected" và chủ hộp thư không thấy cảnh báo nào. Ba lượt hỏng liên tiếp mới
 * hạ trạng thái (sidecar tự nối lại, một nhịp lỡ không được làm hộp thư nhấp nháy đỏ);
 * hồi lại thì tự đưa về `connected`.
 */
class HealthSweepJob extends ApplicationJob
{
    public const FAILURE_THRESHOLD = 3;

    private const HEALTHY_STATE = 'connected';

    private const REASON_BRIDGE_DOWN = 'bridge_down';

    public function __construct(private readonly ?int $connectionId = null)
    {
        $this->onQueue('scheduled_jobs');
    }

    public function handle(BridgeClient $bridge, HealthMonitor $monitor, OpsAlerter $alerter): void
    {
        $this->channels()->each(function (MessengerPersonal $channel) use ($bridge, $monitor, $alerter) {
            $response = $bridge->health($channel);
            $payload = $response !== null && $response->successful() ? (array) $response->json() : null;

            if (($payload['state'] ?? null) === self::HEALTHY_STATE) {
                $this->markHealthy($channel, $monitor);

                return;
            }

            $this->markFailing($channel, $monitor, $this->reasonOf($response, $payload), $alerter);
        });
    }

    /** @return Collection<int, MessengerPersonal> */
    private function channels(): Collection
    {
        return MessengerPersonal::query()
            ->when($this->connectionId !== null, fn ($query) => $query->whereKey($this->connectionId))
            ->whereIn('state', [MessengerPersonal::STATE_CONNECTED, MessengerPersonal::STATE_SESSION_LOST])
            ->get();
    }

    private function markHealthy(MessengerPersonal $channel, HealthMonitor $monitor): void
    {
        $monitor->clearBridgeFailures($channel->connectionId());

        if (! $channel->isConnected()) {
            $monitor->reset($channel->connectionId());
            $channel->markState(MessengerPersonal::STATE_CONNECTED);
        }
    }

    private function markFailing(MessengerPersonal $channel, HealthMonitor $monitor, string $reason, OpsAlerter $alerter): void
    {
        $failures = $monitor->recordBridgeFailure($channel->connectionId());

        if ($failures < self::FAILURE_THRESHOLD || ! $channel->isConnected()) {
            return;
        }

        Log::warning('messenger_personal.health.session_lost', [
            'connection_id' => $channel->connectionId(),
            'failures' => $failures,
            'reason' => $reason,
        ]);

        $monitor->recordError($channel->connectionId(), 'session_lost');
        $channel->markState(MessengerPersonal::STATE_SESSION_LOST, $reason);

        // Sidecar chết là mọi kênh cùng hỏng; monitor:check đã báo một lần cho cả sidecar.
        if ($reason === self::REASON_BRIDGE_DOWN) {
            return;
        }

        $alerter->send(
            "messenger-personal-session-lost:{$channel->connectionId()}",
            "Kênh Messenger cá nhân #{$channel->connectionId()} mất phiên (lý do: {$reason}) — chủ hộp thư cần đăng nhập lại.",
        );
    }

    /** @param array<string, mixed>|null $payload */
    private function reasonOf(?Response $response, ?array $payload): string
    {
        if ($response === null) {
            return self::REASON_BRIDGE_DOWN;
        }

        if ($payload === null) {
            return 'bridge_error_'.$response->status();
        }

        return is_string($payload['session_lost_reason'] ?? null) && $payload['session_lost_reason'] !== ''
            ? $payload['session_lost_reason']
            : 'bridge_slot_'.(string) ($payload['state'] ?? 'unknown');
    }
}
