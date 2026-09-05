<?php

namespace App\Services\AutoAssignment;

use App\Models\Conversation;
use App\Models\User;
use App\Support\OnlineStatusTracker;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/services/auto_assignment/agent_assignment_service.rb.
// allowedAgentIds = danh sách agent được phép nhận (member inbox có sức chứa,
// giao với thành viên team…); round-robin chỉ chạy trên phần đang online.
final class AgentAssignmentService
{
    /** @param list<int|string> $allowedAgentIds */
    public function __construct(
        private readonly Conversation $conversation,
        private readonly array $allowedAgentIds,
    ) {}

    public function findAssignee(): ?User
    {
        return (new InboxRoundRobinService($this->conversation->inbox))->availableAgent($this->allowedOnlineAgentIds());
    }

    // Khóa hàng dưới DB để nối tiếp với các luồng gán khác, rồi gán assignee lên
    // bản ghi đang trong bộ nhớ mà KHÔNG lưu — người gọi (before_save của
    // conversation) lưu chung một lượt nên status và assignee vào cùng một
    // change-set. Trả agent mới, hoặc null khi không đổi gì.
    public function assignUnderLock(): ?User
    {
        $locked = Conversation::query()->whereKey($this->conversation->id)->lockForUpdate()->first();

        if ($locked === null) {
            return null;
        }

        $this->discardAlreadyAppliedStatusChange($locked);

        if (! $this->reassignmentStillNeeded($locked)) {
            return null;
        }

        $newAssignee = $this->findAssignee();

        if ($newAssignee === null) {
            return null;
        }

        // clear_attribute_changes([:assignee_id]) của bản gốc: lấy giá trị dưới DB
        // làm mốc "chưa đổi" rồi mới gán agent mới → chỉ dirty khi thực sự khác.
        $this->conversation->assignee_id = $locked->assignee_id;
        $this->conversation->syncOriginalAttribute('assignee_id');
        $this->conversation->assignee_id = $newAssignee->id;
        $this->conversation->setRelation('assignee', $newAssignee);

        return $newAssignee;
    }

    // Đường tạo mới: tự lưu lấy, ghi qua chính conversation để hook after-commit
    // của nó chạy đủ.
    public function perform(): void
    {
        DB::transaction(function () {
            if ($this->assignUnderLock() !== null) {
                $this->conversation->save();
            }
        });
    }

    // Một luồng khác có thể đã commit đúng chuyển trạng thái này trong lúc ta chờ
    // khóa; giữ bản sao cũ ở trạng thái dirty sẽ thông báo lần hai (trùng event
    // conversation.opened, trùng activity), nên bỏ nó đi.
    private function discardAlreadyAppliedStatusChange(Conversation $locked): void
    {
        if ($this->conversation->isDirty('status') && $this->conversation->status === $locked->status) {
            $this->conversation->syncOriginalAttribute('status');
        }
    }

    // Cột mà lượt lưu đang bay sẽ ghi thì lấy giá trị đang chờ; cột nó không đụng
    // tới thì lấy theo hàng đã khóa — đó là chỗ luồng song song thắng.
    private function reassignmentStillNeeded(Conversation $locked): bool
    {
        $botSource = $this->conversation->isDirty('assignee_agent_bot_id') ? $this->conversation : $locked;

        if (filled($botSource->assignee_agent_bot_id)) {
            return false;
        }

        $assigneeId = $this->conversation->isDirty('assignee_id') ? $this->conversation->assignee_id : $locked->assignee_id;

        return $assigneeId === null
            || ! $locked->inbox->members()->where('users.id', $assigneeId)->exists();
    }

    /** @return list<string> */
    private function allowedOnlineAgentIds(): array
    {
        $allowed = array_map('strval', $this->allowedAgentIds);

        return array_values(array_intersect($this->onlineAgentIds(), $allowed));
    }

    /** @return list<string> */
    private function onlineAgentIds(): array
    {
        return collect(OnlineStatusTracker::getAvailableUsers($this->conversation->account_id))
            ->filter(fn (string $status) => $status === 'online')
            ->keys()
            ->map(fn (int|string $userId) => (string) $userId)
            ->all();
    }
}
