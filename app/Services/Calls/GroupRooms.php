<?php

namespace App\Services\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Models\YonaGroup;
use App\Services\Calls\Policies\CallPolicies;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Str;

// Phòng thoại nhóm luôn mở: mỗi nhóm có tối đa một dòng `calls` đang mở. Vào phòng thì dùng
// dòng đó, chưa có thì mở dòng mới, rồi giao cho lõi CallService.
final readonly class GroupRooms
{
    public function __construct(
        private CallPolicies $policies,
        private CallService $calls,
    ) {}

    public function join(YonaGroup $group, User $user, CallMedia $media): CallJoin
    {
        $draft = new Call(['kind' => CallKind::GroupRoom, 'yona_group_id' => $group->id]);
        $draft->setRelation('group', $group);
        $this->policies->for(CallKind::GroupRoom)->authorizeJoin($draft, $user);

        return $this->calls->join($this->openRoomOf($group, $media), $user);
    }

    private function openRoomOf(YonaGroup $group, CallMedia $media): Call
    {
        $openRoom = fn (): ?Call => Call::query()->open()
            ->where('kind', CallKind::GroupRoom)
            ->where('yona_group_id', $group->id)
            ->first();

        if ($call = $openRoom()) {
            return $call;
        }

        try {
            return Call::query()->create([
                'uuid' => (string) Str::uuid(),
                'kind' => CallKind::GroupRoom,
                'yona_group_id' => $group->id,
                'media' => $media,
                'status' => CallStatus::Active,
            ]);
        } catch (UniqueConstraintViolationException) {
            // Hai người mở phòng cùng lúc: index một-phòng-mở-mỗi-nhóm giữ lại một dòng.
            return $openRoom() ?? throw new CallActionRejected('CALL_ENDED');
        }
    }
}
