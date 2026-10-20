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
use App\Services\Calls\Media\MediaProviderFailed;
use App\Services\Calls\Media\MediaSource;
use App\Services\Calls\ParticipantIdentity;
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
        $admission = $this->calls->admit($this->draftRoomOf($group), $attendee);

        return $this->calls->join($this->openRoomOf($group, $media), $attendee, $admission);
    }

    // Dòng chưa lưu chỉ để hỏi chính sách trước khi tạo phòng cho người không có quyền.
    private function draftRoomOf(YonaGroup $group): Call
    {
        return (new Call(['kind' => GroupRoomPolicy::KIND, 'yona_group_id' => $group->id]))->setRelation('group', $group);
    }

    // Quản trị nhóm tắt mic hoặc mời một người ra khỏi phòng đang mở; quyền kiểm ở lõi.
    public function mute(YonaGroup $group, User $actor, int $targetUserId): void
    {
        $this->calls->mute($this->currentRoomOf($group), $actor, ParticipantIdentity::forUser($targetUserId), MediaSource::Microphone);
    }

    public function remove(YonaGroup $group, User $actor, int $targetUserId): void
    {
        $this->calls->remove($this->currentRoomOf($group), $actor, ParticipantIdentity::forUser($targetUserId));
    }

    // Người không còn trong nhóm: đưa khỏi phòng đang mở. Nhà cung cấp lỗi thì chỉ ghi log,
    // việc rời nhóm vẫn xong.
    public function evict(YonaGroup $group, int $userId): void
    {
        $call = $this->findOpenRoom($group);

        if ($call === null) {
            return;
        }

        try {
            $this->calls->disconnect($call, ParticipantIdentity::forUser($userId));
        } catch (MediaProviderFailed $exception) {
            report($exception);
        }
    }

    private function currentRoomOf(YonaGroup $group): Call
    {
        return $this->findOpenRoom($group) ?? throw new CallActionRejected('CALL_ENDED');
    }

    private function findOpenRoom(YonaGroup $group): ?Call
    {
        return Call::query()->open()
            ->where('kind', GroupRoomPolicy::KIND)
            ->where('yona_group_id', $group->id)
            ->first();
    }

    private function openRoomOf(YonaGroup $group, CallMedia $media): Call
    {
        if ($call = $this->findOpenRoom($group)) {
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
            return $this->currentRoomOf($group);
        }
    }
}
