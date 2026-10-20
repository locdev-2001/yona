<?php

namespace App\Jobs\Calls;

use App\Jobs\ApplicationJob;
use App\Models\YonaGroup;
use App\Services\Groups\Calls\GroupRooms;

// Người vừa rời hoặc bị đưa khỏi nhóm: đưa họ khỏi phòng thoại đang mở của nhóm. Chạy trong
// hàng đợi để việc rời nhóm không phải chờ nhà cung cấp media.
class EvictFromGroupVoiceRoomJob extends ApplicationJob
{
    public function __construct(
        public readonly int $groupId,
        public readonly int $userId,
    ) {
        $this->onQueue('high');
    }

    public function handle(GroupRooms $groupRooms): void
    {
        $group = YonaGroup::query()->find($this->groupId);

        if ($group !== null) {
            $groupRooms->evict($group, $this->userId);
        }
    }
}
