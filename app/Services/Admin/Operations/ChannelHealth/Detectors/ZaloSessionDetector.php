<?php

namespace App\Services\Admin\Operations\ChannelHealth\Detectors;

use App\Models\Channel\Zalo;
use App\Models\Inbox;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblem;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblemDetector;
use App\Services\Zalo\ZaloHealthMonitor;

// Driver của Zalo cá nhân: đọc trạng thái phiên trên bản ghi kênh và bộ đếm của
// ZaloHealthMonitor (cache, do nhịp tim bridge ghi), không gọi ra bridge.
final class ZaloSessionDetector implements ChannelProblemDetector
{
    public const SESSION_LOST = 'session_lost';

    public const DISCONNECTED = 'disconnected';

    public const AWAITING_LOGIN = 'awaiting_login';

    public const BRIDGE_UNREACHABLE = 'bridge_unreachable';

    public const CIRCUIT_OPEN = 'circuit_open';

    public function __construct(private readonly ZaloHealthMonitor $monitor) {}

    public function supports(Inbox $inbox): bool
    {
        return $inbox->channel instanceof Zalo;
    }

    public function detect(Inbox $inbox): ?ChannelProblem
    {
        /** @var Zalo $channel */
        $channel = $inbox->channel;

        return match ($channel->state) {
            Zalo::STATE_SESSION_LOST => new ChannelProblem(self::SESSION_LOST, $channel->session_lost_reason, $channel->last_session_lost_at),
            Zalo::STATE_DISCONNECTED => new ChannelProblem(self::DISCONNECTED, $channel->session_lost_reason, $channel->updated_at),
            Zalo::STATE_QR_WAITING => new ChannelProblem(self::AWAITING_LOGIN, null, $channel->last_qr_at ?? $channel->created_at, ChannelProblem::WARNING),
            default => $this->bridgeProblem($channel),
        };
    }

    private function bridgeProblem(Zalo $channel): ?ChannelProblem
    {
        $connectionId = $channel->connectionId();
        $bridgeFailures = $this->monitor->bridgeFailureCount($connectionId);

        if ($bridgeFailures > 0) {
            return new ChannelProblem(self::BRIDGE_UNREACHABLE, (string) $bridgeFailures, severity: ChannelProblem::WARNING);
        }

        $circuit = $this->monitor->status($connectionId);

        return in_array($circuit['status'], [ZaloHealthMonitor::STATUS_OPEN, ZaloHealthMonitor::STATUS_HALF_OPEN], true)
            ? new ChannelProblem(self::CIRCUIT_OPEN, (string) $circuit['error_count'], severity: ChannelProblem::WARNING)
            : null;
    }
}
