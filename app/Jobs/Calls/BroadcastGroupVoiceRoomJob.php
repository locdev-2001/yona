<?php

namespace App\Jobs\Calls;

use App\Jobs\ActionCableBroadcastJob;
use App\Jobs\ApplicationJob;
use App\Models\YonaGroup;
use App\Models\YonaGroupMember;
use App\Services\Groups\Calls\GroupRoomSummaries;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;

// Đẩy danh sách phòng thoại của một nhóm (`voice_room.updated`) tới dòng nhóm của từng thành
// viên. Duy nhất theo nhóm trong một nhịp: mọi thay đổi trong nhịp gộp vào một lượt, đọc trạng
// thái mới nhất lúc chạy.
class BroadcastGroupVoiceRoomJob extends ApplicationJob implements ShouldBeUniqueUntilProcessing
{
    public const BATCH_SECONDS = 2;

    public const EVENT = 'voice_room.updated';

    public int $uniqueFor = self::BATCH_SECONDS * 5;

    public function __construct(public readonly int $groupId)
    {
        $this->onQueue('high');
    }

    public function uniqueId(): string
    {
        return (string) $this->groupId;
    }

    public function handle(GroupRoomSummaries $summaries): void
    {
        $group = YonaGroup::query()->find($this->groupId);

        if ($group === null) {
            return;
        }

        $snapshot = $summaries->snapshot($group);

        // Payload khác nhau theo account của từng thành viên: mỗi người một job phát, các worker
        // chạy song song thay vì một vòng gọi Reverb tuần tự.
        $group->activeMembers()->with(['user:id,pubsub_token', 'conversation:id,account_id,display_id'])->get()
            ->each(fn (YonaGroupMember $member) => ActionCableBroadcastJob::dispatch([$member->user->pubsub_token], self::EVENT, [
                'account_id' => $member->conversation->account_id,
                'conversation_id' => $member->conversation->display_id,
                'group_id' => $group->id,
                'voice_rooms' => $snapshot['voice_rooms'],
                'voice_room_as_of' => $snapshot['as_of'],
            ]));
    }
}
