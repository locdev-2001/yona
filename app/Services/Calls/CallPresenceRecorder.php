<?php

namespace App\Services\Calls;

use App\Models\Call;
use App\Models\CallParticipant;
use App\Services\Calls\Kinds\CallKinds;
use App\Services\Calls\Media\MediaProviderFailed;
use App\Services\Calls\Media\MediaRooms;
use App\Services\Calls\Media\MediaSource;
use App\Services\Calls\Media\RoomEvent;
use App\Services\Calls\Media\RoomEventType;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Ghi đời phòng và vào/ra phòng từ sự kiện của nhà cung cấp media. Nhà cung cấp có thể
// gửi lại hoặc gửi lệch thứ tự, nên mỗi bước đều chịu được chạy hai lần. Sau khi ghi xong:
// phòng bắt đầu/kết thúc thì báo dấu vết của loại cuộc gọi (CallTrail), người hoặc nguồn
// phát đổi thì báo bên nghe của loại đó (CallPresenceObserver).
final readonly class CallPresenceRecorder
{
    public function __construct(
        private CallKinds $kinds,
        private ScreenShares $screenShares,
    ) {}

    // `$rooms` là vai phòng của chính nhà cung cấp đã gửi sự kiện.
    public function record(RoomEvent $event, MediaRooms $rooms): void
    {
        if (! Str::isUuid($event->room)) {
            return;
        }

        // Hỏi nhà cung cấp trước khi khoá dòng `calls`, để không giữ khoá trong lúc chờ mạng.
        $leaverStillConnected = $event->type === RoomEventType::ParticipantLeft && $this->leaverStillConnected($event, $rooms);

        DB::transaction(function () use ($event, $leaverStillConnected): void {
            $call = Call::query()->where('uuid', $event->room)->lockForUpdate()->first();

            if ($call === null) {
                return;
            }

            match ($event->type) {
                // Phòng tính là bắt đầu khi người đầu tiên vào (recordJoin), không phải lúc nhà
                // cung cấp mở phòng trống.
                RoomEventType::RoomStarted => null,
                RoomEventType::RoomFinished => $this->markFinished($call, $event->occurredAt),
                RoomEventType::ParticipantJoined => $this->recordJoin($call, $event),
                RoomEventType::ParticipantLeft => $leaverStillConnected ? null : $this->recordLeave($call, $event),
                RoomEventType::TrackPublished, RoomEventType::TrackUnpublished => $this->recordScreenShare($call, $event),
            };
        });
    }

    private function markStarted(Call $call, CarbonImmutable $at): void
    {
        if ($call->started_at !== null) {
            return;
        }

        $call->started_at = $at;
        $call->save();
        DB::afterCommit(fn () => $this->kinds->trailOf($call)?->roomStarted($call));
    }

    private function markFinished(Call $call, CarbonImmutable $at): void
    {
        if ($call->isEnded()) {
            return;
        }

        $call->presentParticipants()->update(['left_at' => $at]);
        $call->ended_at = $at;

        if ($call->status === CallStatus::Active) {
            $call->status = CallStatus::Ended;
        }

        $call->save();
        $this->screenShares->clear($call);
        DB::afterCommit(fn () => $this->kinds->trailOf($call)?->roomFinished($call));
        $this->notifyPresenceChanged($call);
    }

    private function recordJoin(Call $call, RoomEvent $event): void
    {
        $participant = ParticipantIdentity::parse($event->identity);

        if ($participant === null || $call->isEnded() || $this->isPresent($call, $participant)) {
            return;
        }

        $call->participants()->create([
            'identity' => $participant->toString(),
            'user_id' => $participant->userId(),
            'display_name' => $event->displayName,
            'joined_at' => $event->occurredAt,
        ]);
        $this->markStarted($call, $event->occurredAt);
        $call->peak_participants = max($call->peak_participants, $call->presentParticipants()->count());
        $call->save();
        $this->notifyPresenceChanged($call);
    }

    private function recordLeave(Call $call, RoomEvent $event): void
    {
        $participant = ParticipantIdentity::parse($event->identity);

        if ($participant === null) {
            return;
        }

        CallParticipant::query()
            ->whereBelongsTo($call)
            ->where('identity', $participant->toString())
            ->whereNull('left_at')
            ->update(['left_at' => $event->occurredAt]);

        if ($participant->userId() !== null) {
            $this->screenShares->stop($call, $participant->userId());
        }

        $this->notifyPresenceChanged($call);
    }

    private function recordScreenShare(Call $call, RoomEvent $event): void
    {
        $userId = $this->storableUserId($event);

        if ($userId === null || $call->isEnded() || $event->source !== MediaSource::Screen) {
            return;
        }

        $event->type === RoomEventType::TrackPublished
            ? $this->screenShares->start($call, $userId)
            : $this->screenShares->stop($call, $userId);
        $this->notifyPresenceChanged($call);
    }

    // Cùng một người vào lại từ tab/thiết bị khác: nhà cung cấp đá phiên cũ và báo "rời" cho phiên
    // cũ trong khi phiên mới vẫn đang kết nối với cùng định danh. Chỉ hỏi khi sự kiện còn đổi được
    // gì (phòng chưa đóng, người đó còn dòng mở). Không hỏi được thì coi như đã rời.
    private function leaverStillConnected(RoomEvent $event, MediaRooms $rooms): bool
    {
        $participant = ParticipantIdentity::parse($event->identity);
        $call = $participant === null ? null : Call::query()->where('uuid', $event->room)->first();

        if ($call === null || $call->isEnded() || ! $this->isPresent($call, $participant)) {
            return false;
        }

        try {
            return in_array((string) $event->identity, $rooms->participantIdentities($call->uuid), true);
        } catch (MediaProviderFailed) {
            return false;
        }
    }

    private function notifyPresenceChanged(Call $call): void
    {
        DB::afterCommit(fn () => $this->kinds->presenceObserverOf($call)?->presenceChanged($call));
    }

    private function isPresent(Call $call, ParticipantIdentity $participant): bool
    {
        return $call->presentParticipants()->where('identity', $participant->toString())->exists();
    }

    // Chia sẻ màn hình hiện ghi theo người dùng (ScreenShares), khách chưa chia sẻ được.
    private function storableUserId(RoomEvent $event): ?int
    {
        return ParticipantIdentity::parse($event->identity)?->userId();
    }
}
