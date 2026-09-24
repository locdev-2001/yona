<?php

namespace App\Models\Concerns;

use App\Events\EventType;
use App\Events\PreviousChanges;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\AssignmentPolicy;
use App\Models\AutomationRule;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Team;
use App\Models\User;
use App\Services\AutoAssignment\AgentAssignmentService;
use App\Support\CurrentExecutedBy;

// Gán agent/team cho hội thoại kèm tin hoạt động tương ứng.
trait AssignmentHandler
{
    // Bản gốc gọi runAssignmentCommitCallbacks() ở after_commit khai báo TRƯỚC
    // after_update_commit của conversation → đăng ký ngay trong boot trait (chạy
    // trước booted()) để listener 'updated' này lên tiếng trước phần status/
    // priority. Đường tạo mới do Conversation::created gọi tay vì phải chờ nạp
    // display_id từ trigger.
    protected static function bootAssignmentHandler(): void
    {
        static::saving(function (Conversation $conversation) {
            $conversation->ensureAssigneeIsFromTeam();
        });

        static::updated(function (Conversation $conversation) {
            $conversation->runAssignmentCommitCallbacks();
        });
    }

    public function runAssignmentCommitCallbacks(): void
    {
        $this->notifyAssignmentChange();
        $this->processAssignmentActivities();
    }

    public function ensureAssigneeIsFromTeam(): void
    {
        if (! $this->isDirty('team_id') || filled($this->assignee_agent_bot_id)) {
            return;
        }

        $team = $this->currentTeam();

        if ($team !== null && ! $team->members()->where('users.id', $this->assignee_id)->exists()) {
            $this->assignee_id = null;
        }

        $this->assignee_id ??= $this->findAssigneeFromTeam($team)?->id;
    }

    private function findAssigneeFromTeam(?Team $team): ?User
    {
        if ($team === null || ! $team->allow_auto_assign) {
            return null;
        }

        $allowedAgentIds = array_values(array_intersect(
            $this->inbox->memberIdsWithAssignmentCapacity(),
            $team->members()->pluck('users.id')->map(fn ($id) => (int) $id)->all(),
        ));

        return (new AgentAssignmentService($this, $allowedAgentIds))->findAssignee();
    }

    private function notifyAssignmentChange(): void
    {
        $previousChanges = PreviousChanges::of($this);

        $conditions = [
            EventType::ASSIGNEE_CHANGED->value => $this->assignmentAttributeChanged('assignee_id')
                || $this->assignmentAttributeChanged('assignee_agent_bot_id'),
            EventType::TEAM_CHANGED->value => $this->assignmentAttributeChanged('team_id'),
        ];

        foreach ($conditions as $event => $condition) {
            if ($condition) {
                $this->dispatcherDispatch(EventType::from($event), $previousChanges);
            }
        }
    }

    private function processAssignmentActivities(): void
    {
        $userName = auth()->user()?->name;

        if ($this->assignmentAttributeChanged('team_id')) {
            $this->createTeamChangeActivity($userName);
        } elseif ($this->assignmentAttributeChanged('assignee_id')) {
            $this->createAssigneeChangeActivity($userName);
        }
    }

    private function createAssigneeChangeActivity(?string $userName): void
    {
        $userName = $this->activityMessageOwner($userName);

        if ($userName === null) {
            return;
        }

        $key = match (true) {
            $this->isSelfAssign() => 'self_assigned',
            $this->assignee_id !== null => 'assigned',
            default => 'removed',
        };

        $content = __('conversations.activity.assignee.'.$key, [
            'assignee_name' => $this->currentAssignee()?->name ?? '',
            'user_name' => $userName,
        ]);

        ActivityMessageJob::dispatch($this, $this->activityMessageParams($content));
    }

    private function createTeamChangeActivity(?string $userName): void
    {
        $userName = $this->activityMessageOwner($userName);

        if ($userName === null) {
            return;
        }

        $team = $this->currentTeam();
        $key = $team === null ? 'removed' : 'assigned';

        if ($key === 'assigned' && $this->assignmentAttributeChanged('assignee_id') && $this->assignee_id !== null) {
            $key .= '_with_assignee';
        }

        $content = __('conversations.activity.team.'.$key, [
            'assignee_name' => $this->currentAssignee()?->name ?? '',
            'team_name' => ($key === 'removed' ? $this->previousTeamName() : $team?->name) ?? '',
            'user_name' => $userName,
        ]);

        ActivityMessageJob::dispatch($this, $this->activityMessageParams($content));
    }

    // Không có người dùng nào đứng sau thay đổi thì chủ thể là chính sách phân
    // công đang chạy (Current.executed_by của bản gốc).
    private function activityMessageOwner(?string $userName): ?string
    {
        $executedBy = CurrentExecutedBy::get();

        if ($executedBy instanceof AutomationRule) {
            return __('automation.system_name');
        }

        if ($userName !== null) {
            return $userName;
        }

        return match (true) {
            $executedBy instanceof AssignmentPolicy => __('auto_assignment.policy_actor', ['policy_name' => $executedBy->name]),
            $executedBy instanceof Inbox => __('auto_assignment.default_policy_name'),
            $executedBy instanceof AutomationRule => __('automation.system_name'),
            default => null,
        };
    }

    private function isSelfAssign(): bool
    {
        return $this->assignee_id !== null && auth()->id() === $this->assignee_id;
    }

    private function previousTeamName(): ?string
    {
        $previousTeamId = $this->getOriginal('team_id');

        return $previousTeamId === null ? null : Team::query()->find($previousTeamId)?->name;
    }

    // Quan hệ đã nạp có thể cũ sau khi khóa ngoại đổi trong cùng lượt lưu — luôn
    // đọc theo khóa hiện tại.
    private function currentTeam(): ?Team
    {
        return $this->team_id === null ? null : Team::query()->find($this->team_id);
    }

    // Public vì listener chạy sau hook cũng cần người nhận việc hiện tại: quan hệ
    // `assignee` đã nạp từ trước lần lưu này nên đọc thẳng sẽ trả giá trị cũ.
    public function currentAssignee(): ?User
    {
        return $this->assignee_id === null ? null : User::query()->find($this->assignee_id);
    }

    // Rails saved_change_to_<attr>?: trên bản ghi vừa tạo, syncChanges() của
    // Eloquent đánh dấu MỌI cột là đã đổi, còn Rails chỉ tính cột khác mặc định
    // → cột null lúc tạo coi như không đổi.
    private function assignmentAttributeChanged(string $attribute): bool
    {
        return $this->wasRecentlyCreated && $this->wasChanged('id')
            ? filled($this->getAttribute($attribute))
            : $this->wasChanged($attribute);
    }
}
