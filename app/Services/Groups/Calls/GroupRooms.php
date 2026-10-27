<?php

namespace App\Services\Groups\Calls;

use App\Exceptions\CallActionRejected;
use App\Models\Call;
use App\Models\User;
use App\Models\YonaGroup;
use App\Models\YonaGroupVoiceRoom;
use App\Services\Calls\CallAttendee;
use App\Services\Calls\CallJoin;
use App\Services\Calls\CallMedia;
use App\Services\Calls\CallService;
use App\Services\Calls\CallStatus;
use App\Services\Calls\Media\MediaSource;
use App\Services\Calls\ParticipantIdentity;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Phòng thoại nhóm luôn mở, dựng trên lõi cuộc gọi: mỗi phòng có tên (GroupVoiceRooms) có tối
// đa một dòng `calls` đang mở (`open_call_id`). Vào phòng thì dùng dòng đó, chưa có thì mở dòng
// mới, rồi giao cho CallService. Lõi không biết phòng: nó chỉ thấy một cuộc gọi loại group_room.
final readonly class GroupRooms
{
    public function __construct(
        private CallService $calls,
        private GroupVoiceRooms $rooms,
    ) {}

    // Không chỉ phòng thì vào phòng đầu danh sách.
    public function join(YonaGroup $group, ?int $roomId, User $user, CallMedia $media): CallJoin
    {
        $attendee = CallAttendee::user($user);
        $admission = $this->calls->admit($this->draftRoomOf($group), $attendee);
        $room = $this->rooms->find($group, $roomId);

        return $this->calls->join($this->openCallOf($room, $media), $attendee, $admission);
    }

    // Dòng chưa lưu chỉ để hỏi chính sách trước khi tạo phòng cho người không có quyền.
    private function draftRoomOf(YonaGroup $group): Call
    {
        return (new Call(['kind' => GroupRoomPolicy::KIND, 'yona_group_id' => $group->id]))->setRelation('group', $group);
    }

    // Quản trị nhóm tắt mic hoặc mời một người ra khỏi phòng người đó đang ngồi; quyền kiểm ở lõi.
    public function mute(YonaGroup $group, User $actor, int $targetUserId): void
    {
        $this->calls->mute($this->roomSeating($group, $targetUserId), $actor, ParticipantIdentity::forUser($targetUserId), MediaSource::Microphone);
    }

    public function remove(YonaGroup $group, User $actor, int $targetUserId): void
    {
        $this->calls->remove($this->roomSeating($group, $targetUserId), $actor, ParticipantIdentity::forUser($targetUserId));
    }

    // Người không còn trong nhóm: đưa khỏi mọi phòng đang mở của nhóm. Chạy trong job
    // (EvictFromGroupVoiceRoomJob), nhà cung cấp lỗi thì ném ra để job thử lại.
    public function evict(YonaGroup $group, int $userId): void
    {
        $this->openCallsOf($group)->each(fn (Call $call) => $this->calls->disconnect($call, ParticipantIdentity::forUser($userId)));
    }

    private function roomSeating(YonaGroup $group, int $userId): Call
    {
        return $this->openCallsOf($group)->first(fn (Call $call) => $call->presentParticipants()->where('user_id', $userId)->exists())
            ?? throw new CallActionRejected('CALL_ENDED');
    }

    /** @return Collection<int, Call> */
    private function openCallsOf(YonaGroup $group): Collection
    {
        return Call::query()->open()->where('kind', GroupRoomPolicy::KIND)->where('yona_group_id', $group->id)->get();
    }

    // Khoá dòng phòng: hai người mở cùng một phòng cùng lúc thì chỉ một dòng `calls` được tạo.
    private function openCallOf(YonaGroupVoiceRoom $room, CallMedia $media): Call
    {
        return DB::transaction(function () use ($room, $media): Call {
            $locked = YonaGroupVoiceRoom::query()->whereKey($room->id)->lockForUpdate()->firstOrFail();

            if ($call = $locked->liveCall()) {
                return $call;
            }

            $call = Call::query()->create([
                'uuid' => (string) Str::uuid(),
                'kind' => GroupRoomPolicy::KIND,
                'yona_group_id' => $locked->yona_group_id,
                'media' => $media,
                'status' => CallStatus::Active,
            ]);
            $locked->update(['open_call_id' => $call->id]);

            return $call;
        });
    }
}
