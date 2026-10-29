<?php

namespace App\Services\Admin\Operations\ChannelHealth\Detectors;

use App\Models\Channel\MessengerPersonal;
use App\Models\Inbox;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblem;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblemDetector;
use App\Services\MessengerPersonal\HealthMonitor;

// Driver của Messenger cá nhân: đọc trạng thái phiên trên bản ghi kênh và bộ đếm do
// nhịp tim sidecar ghi (cache), không gọi ra sidecar.
final class MessengerPersonalSessionDetector implements ChannelProblemDetector
{
    public const SESSION_LOST = 'messenger_session_lost';

    public const DISCONNECTED = 'messenger_disconnected';

    public const AWAITING_LOGIN = 'messenger_awaiting_login';

    public const BRIDGE_UNREACHABLE = 'messenger_bridge_unreachable';

    public const CIRCUIT_OPEN = 'messenger_circuit_open';

    public function __construct(private readonly HealthMonitor $monitor) {}

    public function supports(Inbox $inbox): bool
    {
        return $inbox->channel instanceof MessengerPersonal;
    }

    public function detect(Inbox $inbox): ?ChannelProblem
    {
        /** @var MessengerPersonal $channel */
        $channel = $inbox->channel;

        return match ($channel->state) {
            MessengerPersonal::STATE_SESSION_LOST => new ChannelProblem(self::SESSION_LOST, $channel->session_lost_reason, $channel->last_session_lost_at),
            MessengerPersonal::STATE_DISCONNECTED => new ChannelProblem(self::DISCONNECTED, $channel->session_lost_reason, $channel->updated_at),
            MessengerPersonal::STATE_LOGIN_PENDING => new ChannelProblem(self::AWAITING_LOGIN, null, $channel->last_login_at ?? $channel->created_at, ChannelProblem::WARNING),
            default => $this->bridgeProblem($channel),
        };
    }

    private function bridgeProblem(MessengerPersonal $channel): ?ChannelProblem
    {
        $connectionId = $channel->connectionId();
        $bridgeFailures = $this->monitor->bridgeFailureCount($connectionId);

        if ($bridgeFailures > 0) {
            return new ChannelProblem(self::BRIDGE_UNREACHABLE, (string) $bridgeFailures, severity: ChannelProblem::WARNING);
        }

        $circuit = $this->monitor->status($connectionId);

        return in_array($circuit['status'], [HealthMonitor::STATUS_OPEN, HealthMonitor::STATUS_HALF_OPEN], true)
            ? new ChannelProblem(self::CIRCUIT_OPEN, (string) $circuit['error_count'], severity: ChannelProblem::WARNING)
            : null;
    }
}
