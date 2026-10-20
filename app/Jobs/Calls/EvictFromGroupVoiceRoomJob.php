<?php

namespace App\Jobs\Calls;

use App\Jobs\ApplicationJob;
use App\Models\YonaGroup;
use App\Services\Groups\Calls\GroupRooms;

// Người vừa rời hoặc bị đưa khỏi nhóm: đưa họ khỏi phòng thoại đang mở của nhóm. Chạy trong
// hàng đợi để việc rời nhóm không phải chờ nhà cung cấp media.
class EvictFromGroupVoiceRoomJob extends ApplicationJob
{
    // Nhà cung cấp media chập chờn thì thử lại, đừng để người đã rời nhóm ngồi lại trong phòng.
    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [5, 15, 30, 60];

    public function __construct(
        public readonly int $groupId,
        public readonly int $userId,
    ) {
        $this->onQueue('high');
    }

    public function handle(GroupRooms $groupRooms): void
    {
        $group = YonaGroup::query()->find($this->groupId);

        // Đã vào lại nhóm trước khi job chạy thì không đưa ra nữa.
        if ($group === null || $group->activeMembers()->where('user_id', $this->userId)->exists()) {
            return;
        }

        $groupRooms->evict($group, $this->userId);
    }
}
