<?php

namespace App\Services\Calls;

use App\Models\Call;
use App\Models\CallParticipant;
use App\Services\Calls\Media\RoomEvent;
use App\Services\Calls\Media\RoomEventType;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Ghi đời phòng và vào/ra phòng từ sự kiện của nhà cung cấp media. Nhà cung cấp có thể
// gửi lại hoặc gửi lệch thứ tự, nên mỗi bước đều chịu được chạy hai lần.
final class CallPresenceRecorder
{
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
        $call->started_at ??= $at;
        $call->save();
    }

    private function markFinished(Call $call, CarbonImmutable $at): void
    {
        $call->presentParticipants()->update(['left_at' => $at]);
        $call->ended_at ??= $at;

        if ($call->status === CallStatus::Active) {
            $call->status = CallStatus::Ended;
        }

        $call->save();
    }

    private function recordJoin(Call $call, RoomEvent $event): void
    {
        $userId = ParticipantIdentity::userId($event->identity);

        if ($userId === null || $call->isEnded() || $call->presentParticipants()->where('user_id', $userId)->exists()) {
            return;
        }

        $call->participants()->create(['user_id' => $userId, 'joined_at' => $event->occurredAt]);
        $call->started_at ??= $event->occurredAt;
        $call->peak_participants = max($call->peak_participants, $call->presentParticipants()->count());
        $call->save();
    }

    private function recordLeave(Call $call, RoomEvent $event): void
    {
        $userId = ParticipantIdentity::userId($event->identity);

        if ($userId === null) {
            return;
        }

        CallParticipant::query()
            ->whereBelongsTo($call)
            ->where('user_id', $userId)
            ->whereNull('left_at')
            ->update(['left_at' => $event->occurredAt]);
    }
}
