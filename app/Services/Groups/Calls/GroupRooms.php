<?php

namespace App\Services\Groups\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Models\YonaGroup;
use App\Services\Calls\CallAttendee;
use App\Services\Calls\CallJoin;
use App\Services\Calls\CallMedia;
use App\Services\Calls\CallService;
use App\Services\Calls\CallStatus;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Str;

// Phòng thoại nhóm luôn mở, dựng trên lõi cuộc gọi: mỗi nhóm có tối đa một dòng `calls` đang
// mở. Vào phòng thì dùng dòng đó, chưa có thì mở dòng mới, rồi giao cho CallService.
final readonly class GroupRooms
{
    public function __construct(private CallService $calls) {}

    public function join(YonaGroup $group, User $user, CallMedia $media): CallJoin
    {
        $attendee = CallAttendee::user($user);
        $this->calls->admit($this->draftRoomOf($group), $attendee);

        return $this->calls->join($this->openRoomOf($group, $media), $attendee);
    }

    // Dòng chưa lưu chỉ để hỏi chính sách trước khi tạo phòng cho người không có quyền.
    private function draftRoomOf(YonaGroup $group): Call
    {
        return (new Call(['kind' => GroupRoomPolicy::KIND, 'yona_group_id' => $group->id]))->setRelation('group', $group);
    }

    private function openRoomOf(YonaGroup $group, CallMedia $media): Call
    {
        $openRoom = fn (): ?Call => Call::query()->open()
            ->where('kind', GroupRoomPolicy::KIND)
            ->where('yona_group_id', $group->id)
            ->first();

        if ($call = $openRoom()) {
            return $call;
        }

        try {
            return Call::query()->create([
                'uuid' => (string) Str::uuid(),
                'kind' => GroupRoomPolicy::KIND,
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
