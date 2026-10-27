<?php

namespace App\Services\Groups\Calls;

use App\Exceptions\GroupActionRejected;
use App\Jobs\Calls\BroadcastGroupVoiceRoomJob;
use App\Models\Call;
use App\Models\User;
use App\Models\YonaGroup;
use App\Models\YonaGroupVoiceRoom;
use App\Services\Groups\GroupPermissions;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Danh sách phòng thoại có tên của nhóm: thành viên xem, quản trị tạo/đổi tên/xoá. Nhóm luôn có
// ít nhất một phòng; nhóm chưa có phòng nào (nhóm cũ, nhóm mới tạo) được tạo phòng mặc định lúc
// đọc, nhận luôn phòng đang mở từ trước nếu có. Đổi danh sách thì báo lại mọi thành viên.
final readonly class GroupVoiceRooms
{
    public function __construct(
        private GroupPermissions $permissions,
        private Cache $cache,
    ) {}

    /** @return Collection<int, YonaGroupVoiceRoom> */
    public function of(YonaGroup $group): Collection
    {
        $rooms = $group->voiceRooms()->with('openCall')->get();

        if ($rooms->isNotEmpty()) {
            return $rooms;
        }

        DB::transaction(function () use ($group): void {
            YonaGroup::query()->whereKey($group->id)->lockForUpdate()->first();

            if ($group->voiceRooms()->exists()) {
                return;
            }

            $group->voiceRooms()->create([
                'position' => 0,
                'open_call_id' => Call::query()->open()->where('kind', GroupRoomPolicy::KIND)->where('yona_group_id', $group->id)->value('id'),
            ]);
        });

        return $group->voiceRooms()->with('openCall')->get();
    }

    public function find(YonaGroup $group, ?int $roomId): YonaGroupVoiceRoom
    {
        $rooms = $this->of($group);

        return ($roomId === null ? $rooms->first() : $rooms->firstWhere('id', $roomId))
            ?? throw new GroupActionRejected('ROOM_NOT_FOUND', 404);
    }

    public function create(YonaGroup $group, User $admin, string $name): YonaGroupVoiceRoom
    {
        $this->permissions->admin($group, $admin);
        $rooms = $this->of($group);

        if ($rooms->count() >= YonaGroupVoiceRoom::MAX_PER_GROUP) {
            throw new GroupActionRejected('ROOM_LIMIT', replace: ['max' => YonaGroupVoiceRoom::MAX_PER_GROUP]);
        }

        $room = $group->voiceRooms()->create([
            'name' => $this->cleanName($name),
            'position' => (int) $rooms->max('position') + 1,
            'created_by_id' => $admin->id,
        ]);
        $this->announce($group);

        return $room;
    }

    public function rename(YonaGroup $group, User $admin, int $roomId, string $name): YonaGroupVoiceRoom
    {
        $this->permissions->admin($group, $admin);
        $room = $this->find($group, $roomId);
        $room->update(['name' => $this->cleanName($name)]);
        $this->announce($group);

        return $room;
    }

    public function delete(YonaGroup $group, User $admin, int $roomId): void
    {
        $this->permissions->admin($group, $admin);
        $rooms = $this->of($group);
        $room = $rooms->firstWhere('id', $roomId) ?? throw new GroupActionRejected('ROOM_NOT_FOUND', 404);

        if ($rooms->count() === 1) {
            throw new GroupActionRejected('LAST_ROOM');
        }

        if ($room->liveCall() !== null) {
            throw new GroupActionRejected('ROOM_LIVE');
        }

        $room->delete();
        $this->announce($group);
    }

    private function announce(YonaGroup $group): void
    {
        $this->cache->forget(GroupRoomSummaries::key($group->id));
        BroadcastGroupVoiceRoomJob::dispatch($group->id);
    }

    private function cleanName(string $name): string
    {
        $name = trim($name);

        if ($name === '') {
            throw new GroupActionRejected('ROOM_NAME_REQUIRED');
        }

        if (mb_strlen($name) > YonaGroupVoiceRoom::NAME_MAX_LENGTH) {
            throw new GroupActionRejected('ROOM_NAME_TOO_LONG', replace: ['max' => YonaGroupVoiceRoom::NAME_MAX_LENGTH]);
        }

        return $name;
    }
}
