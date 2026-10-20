<?php

namespace App\Services\Calls;

use App\Models\Call;
use App\Models\CallParticipant;
use App\Services\Calls\Kinds\CallKinds;
use App\Services\Calls\Media\RoomEvent;
use App\Services\Calls\Media\RoomEventType;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Ghi đời phòng và vào/ra phòng từ sự kiện của nhà cung cấp media. Nhà cung cấp có thể
// gửi lại hoặc gửi lệch thứ tự, nên mỗi bước đều chịu được chạy hai lần. Phòng bắt đầu/kết
// thúc thì báo dấu vết của loại cuộc gọi (CallTrail) sau khi đã ghi xong.
final readonly class CallPresenceRecorder
{
    public function __construct(private CallKinds $kinds) {}

    public function record(RoomEvent $event): void
    {
        if (! Str::isUuid($event->room)) {
            return;
        }

        DB::transaction(function () use ($event): void {
            $call = Call::query()->where('uuid', $event->room)->lockForUpdate()->first();

            if ($call === null) {
                return;
            }

            match ($event->type) {
                RoomEventType::RoomStarted => $this->markStarted($call, $event->occurredAt),
                RoomEventType::RoomFinished => $this->markFinished($call, $event->occurredAt),
                RoomEventType::ParticipantJoined => $this->recordJoin($call, $event),
                RoomEventType::ParticipantLeft => $this->recordLeave($call, $event),
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
        DB::afterCommit(fn () => $this->kinds->trailOf($call)?->roomFinished($call));
    }

    private function recordJoin(Call $call, RoomEvent $event): void
    {
        $userId = $this->storableUserId($event);

        if ($userId === null || $call->isEnded() || $call->presentParticipants()->where('user_id', $userId)->exists()) {
            return;
        }

        // Sự kiện bắt đầu phòng có thể tới sau, hoặc đã mất: người đầu tiên vào là phòng đã bắt đầu.
        $this->markStarted($call, $event->occurredAt);
        $call->participants()->create(['user_id' => $userId, 'joined_at' => $event->occurredAt]);
        $call->peak_participants = max($call->peak_participants, $call->presentParticipants()->count());
        $call->save();
    }

    private function recordLeave(Call $call, RoomEvent $event): void
    {
        $userId = $this->storableUserId($event);

        if ($userId === null) {
            return;
        }

        CallParticipant::query()
            ->whereBelongsTo($call)
            ->where('user_id', $userId)
            ->whereNull('left_at')
            ->update(['left_at' => $event->occurredAt]);
    }

    // `call_participants` hiện chỉ chứa người dùng Yona; khách (meeting) chờ schema được duyệt.
    private function storableUserId(RoomEvent $event): ?int
    {
        return ParticipantIdentity::parse($event->identity)?->userId();
    }
}
