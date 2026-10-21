<?php

namespace App\Jobs\Calls;

use App\Jobs\ActionCableBroadcastJob;
use App\Jobs\ApplicationJob;
use App\Models\YonaGroup;
use App\Models\YonaGroupMember;
use App\Services\Calls\InvitationStatus;
use App\Services\Groups\Calls\GroupCalls;
use App\Services\Groups\Calls\GroupCallSignals;
use App\Services\Groups\Calls\GroupCallSummaries;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;

// Đẩy cuộc gọi nhóm (`group_call.updated`) tới dòng nhóm của từng thành viên. Không trễ vì đổ
// chuông phải tới ngay; các thay đổi dồn tới khi job chưa chạy gộp vào một lượt, đọc trạng thái mới
// nhất lúc chạy.
class BroadcastGroupCallJob extends ApplicationJob implements ShouldBeUniqueUntilProcessing
{
    public int $uniqueFor = 10;

    public function __construct(public readonly int $groupId)
    {
        $this->onQueue('critical');
    }

    public function uniqueId(): string
    {
        return (string) $this->groupId;
    }

    public function handle(GroupCalls $groupCalls, GroupCallSummaries $summaries, GroupCallSignals $signals): void
    {
        $group = YonaGroup::query()->find($this->groupId);

        if ($group === null) {
            return;
        }

        $snapshot = $summaries->snapshot($group);
        $call = $groupCalls->liveCallOf($group);
        $invitations = $call?->invitations()->pluck('status', 'user_id') ?? collect();

        $group->activeMembers()->with(['user:id,pubsub_token', 'conversation:id,account_id,display_id'])->get(['id', 'user_id', 'conversation_id', 'role'])
            ->each(fn (YonaGroupMember $member) => ActionCableBroadcastJob::dispatch(
                [$member->user->pubsub_token],
                GroupCallSignals::EVENT,
                $signals->viewFor($group, $member, $snapshot, self::statusOf($invitations->get($member->user_id))),
            ));
    }

    private static function statusOf(InvitationStatus|string|null $status): ?InvitationStatus
    {
        return is_string($status) ? InvitationStatus::tryFrom($status) : $status;
    }
}
