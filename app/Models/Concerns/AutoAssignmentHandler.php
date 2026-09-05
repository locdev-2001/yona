<?php

namespace App\Models\Concerns;

use App\Jobs\AutoAssignment\AssignmentJob;
use App\Models\Conversation;
use App\Services\AutoAssignment\AgentAssignmentService;

// Port từ refs/chatwoot/app/models/concerns/auto_assignment_handler.rb.
trait AutoAssignmentHandler
{
    protected static function bootAutoAssignmentHandler(): void
    {
        static::saving(function (Conversation $conversation) {
            if ($conversation->exists) {
                $conversation->runLegacyAutoAssignment();
            }
        });

        static::saved(function (Conversation $conversation) {
            $conversation->runAutoAssignment();
        });
    }

    // Phân công V1 cho lần đổi trạng thái chạy TRONG cùng lượt lưu, để status và
    // assignee vào chung một change-set; lưu thêm lần nữa sẽ xóa saved_changes và
    // giấu mất chuyển trạng thái khỏi các hook sau commit (mất conversation.opened).
    public function runLegacyAutoAssignment(): void
    {
        if (! $this->isDirty('status') || ! $this->isOpen()) {
            return;
        }

        if ($this->inbox->autoAssignmentV2Enabled() || ! $this->shouldRunAutoAssignment()) {
            return;
        }

        (new AgentAssignmentService($this, $this->legacyAllowedAgentIds()))->assignUnderLock();
    }

    public function runAutoAssignment(): void
    {
        // V2 chạy cả khi hội thoại resolved/snoozed để job phân bổ lại sức chứa.
        if (! $this->statusChangedToOpen() && ! $this->statusChangedToResolvedOrSnoozed()) {
            return;
        }

        if (! $this->shouldRunAutoAssignment()) {
            return;
        }

        if ($this->inbox->autoAssignmentV2Enabled()) {
            // Gộp các lượt kích hoạt dồn dập theo inbox. Job có chạy khi lượt lưu
            // bao ngoài bị rollback cũng vô hại: nó chỉ quét hội thoại chưa gán
            // hiện có của inbox.
            AssignmentJob::enqueueForInbox($this->inbox_id);

            return;
        }

        if ($this->wasChanged('id')) {
            // V1 cho hội thoại mới phải ở sau khi lưu: trạng thái của nó chỉ chốt
            // ở các hook before_create, chạy sau before_save.
            (new AgentAssignmentService($this, $this->legacyAllowedAgentIds()))->perform();
        }
    }

    private function statusChangedToOpen(): bool
    {
        return $this->isOpen() && ($this->wasChanged('id') || $this->wasChanged('status'));
    }

    private function statusChangedToResolvedOrSnoozed(): bool
    {
        return $this->inbox->autoAssignmentV2Enabled()
            && $this->wasChanged('status')
            && ($this->isResolved() || $this->isSnoozed());
    }

    private function shouldRunAutoAssignment(): bool
    {
        if (! $this->inbox->enable_auto_assignment) {
            return false;
        }

        // Hội thoại resolved/snoozed vẫn còn assignee nên bỏ qua kiểm tra bên dưới
        // — job cần chạy để cân bằng lại.
        if ($this->statusChangedToResolvedOrSnoozed()) {
            return true;
        }

        if (filled($this->assignee_agent_bot_id)) {
            return false;
        }

        return $this->assignee_id === null
            || ! $this->inbox->members()->where('users.id', $this->assignee_id)->exists();
    }

    /** @return list<int> */
    private function legacyAllowedAgentIds(): array
    {
        return $this->team_id !== null
            ? $this->teamMemberIdsWithCapacity()
            : $this->inbox->memberIdsWithAssignmentCapacity();
    }

    /** @return list<int> */
    private function teamMemberIdsWithCapacity(): array
    {
        $team = $this->team;

        if ($team === null || ! $team->allow_auto_assign) {
            return [];
        }

        return array_values(array_intersect(
            $this->inbox->memberIdsWithAssignmentCapacity(),
            $team->members()->pluck('users.id')->map(fn ($id) => (int) $id)->all(),
        ));
    }
}
