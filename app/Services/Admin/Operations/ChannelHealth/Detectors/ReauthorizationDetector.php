<?php

namespace App\Services\Admin\Operations\ChannelHealth\Detectors;

use App\Channels\Capability;
use App\Models\Inbox;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblem;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblemDetector;

// Driver chung: mọi kênh khai năng lực `session_reauth` đều trả lời được câu
// "cần cấp quyền lại chưa" qua contract của Inbox.
final class ReauthorizationDetector implements ChannelProblemDetector
{
    public const PROBLEM = 'reauthorization_required';

    public function supports(Inbox $inbox): bool
    {
        return $inbox->supports(Capability::SessionReauth);
    }

    public function detect(Inbox $inbox): ?ChannelProblem
    {
        return $inbox->reauthorizationRequired() ? new ChannelProblem(self::PROBLEM) : null;
    }
}
