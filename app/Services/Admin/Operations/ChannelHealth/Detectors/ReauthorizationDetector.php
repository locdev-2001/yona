<?php

namespace App\Services\Admin\Operations\ChannelHealth\Detectors;

use App\Channels\Capability;
use App\Models\Inbox;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblem;
use App\Services\Admin\Operations\ChannelHealth\ChannelProblemDetector;

// Driver chung: mọi kênh khai năng lực `session_reauth` đều trả lời được câu
// "cần cấp quyền lại chưa" qua contract của Inbox. Kênh có bộ đếm lỗi xác thực
// (IMAP/SMTP, Meta…) mà chưa chạm ngưỡng thì báo cảnh báo kèm số lần lỗi.
final class ReauthorizationDetector implements ChannelProblemDetector
{
    public const PROBLEM = 'reauthorization_required';

    public const AUTHORIZATION_ERRORS = 'authorization_errors';

    public function supports(Inbox $inbox): bool
    {
        return $inbox->supports(Capability::SessionReauth);
    }

    public function detect(Inbox $inbox): ?ChannelProblem
    {
        $errors = method_exists($inbox->channel, 'authorizationErrorCount') ? $inbox->channel->authorizationErrorCount() : 0;

        if ($inbox->reauthorizationRequired()) {
            return new ChannelProblem(self::PROBLEM, $errors > 0 ? (string) $errors : null);
        }

        return $errors > 0
            ? new ChannelProblem(self::AUTHORIZATION_ERRORS, (string) $errors, severity: ChannelProblem::WARNING)
            : null;
    }
}
