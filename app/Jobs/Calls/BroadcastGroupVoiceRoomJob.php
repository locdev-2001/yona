<?php

namespace App\Jobs\Calls;

use App\Events\RealtimeBroadcast;
use App\Jobs\ApplicationJob;
use App\Models\YonaGroup;
use App\Models\YonaGroupMember;
use App\Services\Groups\Calls\GroupRoomSummaries;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;

// Đẩy chỉ báo phòng thoại của một nhóm (`voice_room.updated`) tới dòng nhóm của từng thành
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

        $voiceRoom = $summaries->of($group);

        $group->activeMembers()->with(['user:id,pubsub_token', 'conversation:id,account_id,display_id'])->get()
            ->each(fn (YonaGroupMember $member) => broadcast(new RealtimeBroadcast([$member->user->pubsub_token], self::EVENT, [
                'account_id' => $member->conversation->account_id,
                'conversation_id' => $member->conversation->display_id,
                'group_id' => $group->id,
                'voice_room' => $voiceRoom,
            ])));
    }
}
