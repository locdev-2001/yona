<?php

namespace App\Modules\Automation\Handlers;

use App\Models\User;
use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;
use App\Notifications\EntityNotification;
use App\Services\NotificationService;

/**
 * Thông báo nội bộ (action) — delegate NotificationService::notify().
 */
class NotifyInternalNodeHandler implements NodeHandler
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function type(): string
    {
        return 'notify_internal';
    }

    public function handle(WorkflowRun $run, array $node): NodeHandlerResult
    {
        $userIds = $node['config']['user_ids'] ?? [];

        if (empty($userIds)) {
            return NodeHandlerResult::skipped('no recipients configured', branch: null);
        }

        $recipients = User::whereIn('id', $userIds)->get();

        if ($recipients->isEmpty()) {
            return NodeHandlerResult::skipped('no valid recipients found', branch: null);
        }

        $subject = $run->subject();

        if ($subject === null) {
            // EntityNotification requires a Model with a registered morph
            // class — WorkflowRun itself is not registered (it's never meant
            // to appear in a *_type morph column), and there's no other
            // meaningful subject once the enrolled entity is gone.
            return NodeHandlerResult::skipped('subject not found', branch: null);
        }

        $this->notifications->notify($recipients, new EntityNotification(
            action: 'automation.notify',
            subject: $subject,
            payload: ['message' => $node['config']['message'] ?? ''],
        ));

        return NodeHandlerResult::success('notification sent');
    }
}
