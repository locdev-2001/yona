<?php

namespace App\Services\Groups\Calls;

use App\Models\Call;
use App\Models\CallParticipant;
use App\Models\User;
use App\Services\Calls\CallStatus;
use App\Services\Calls\Kinds\CallTrail;
use App\Services\Groups\GroupService;
use Carbon\CarbonInterval;

// Dấu vết cuộc gọi nhóm trong hội thoại nhóm (người gọi là người gửi): một tin khi người gọi vào phòng (thẻ "Tham gia" khi
// cuộc gọi còn diễn ra), phòng đóng thì chính tin đó đổi thành kết quả, thời lượng, ai đã tham gia. Như phòng
// thoại, lời hiển thị dịch theo người đọc từ `content_attributes.call`; `content` là bản ngôn ngữ
// mặc định cho tìm kiếm.
final readonly class GroupCallTrail implements CallTrail
{
    private const DURATION_PARTS = 2;

    public function __construct(private GroupService $groups) {}

    public function roomStarted(Call $call): void
    {
        $caller = User::query()->find($call->caller_id);
        $locale = (string) config('app.locale');

        $this->groups->postCallNotice($call->group, __('calls.ACTIVITY.GROUP_CALL_STARTED', ['actor' => $caller?->availableName() ?? ''], $locale), [
            ...$this->basics($call, $caller),
            'status' => 'ringing',
        ], $caller);
    }

    public function roomFinished(Call $call): void
    {
        $caller = User::query()->find($call->caller_id);
        $durationSeconds = $call->answered_at === null || $call->ended_at === null ? 0 : (int) $call->answered_at->diffInSeconds($call->ended_at);
        $attendees = $call->participants()->with('user')->orderBy('joined_at')->get()
            ->map(fn (CallParticipant $participant) => $participant->user)
            ->filter()
            ->unique('id')
            ->values();
        $locale = (string) config('app.locale');
        $content = $call->answered_at === null
            ? __('calls.ACTIVITY.GROUP_CALL_UNANSWERED', [], $locale)
            : trans_choice('calls.ACTIVITY.GROUP_CALL_ENDED', $attendees->count(), [
                'duration' => CarbonInterval::seconds($durationSeconds)->cascade()->locale($locale)->forHumans(['parts' => self::DURATION_PARTS]),
                'count' => $attendees->count(),
            ], $locale);

        $this->groups->postCallNotice($call->group, $content, [
            ...$this->basics($call, $caller),
            // Phòng tự đóng khi còn đổ chuông thì chưa kịp chốt trạng thái: không ai nghe.
            'status' => $call->status === CallStatus::Ringing ? CallStatus::Missed->value : $call->status->value,
            'duration_seconds' => $durationSeconds,
            'rang_at' => $call->created_at?->toIso8601String(),
            'answered_at' => $call->answered_at?->toIso8601String(),
            'ended_at' => $call->ended_at?->toIso8601String(),
            'participants' => $attendees->count(),
            'attendees' => $attendees->map(fn (User $user) => [
                'user_id' => $user->id,
                'name' => $user->availableName(),
                'avatar_url' => $user->avatarUrl() ?: null,
            ])->all(),
        ], $caller);
    }

    /** @return array<string, mixed> */
    private function basics(Call $call, ?User $caller): array
    {
        return [
            'id' => $call->id,
            'kind' => $call->kind,
            'status' => $call->status->value,
            'media' => $call->media->value === 'video' ? 'video' : 'voice',
            'actor' => $caller === null ? null : ['user_id' => $caller->id, 'name' => $caller->availableName()],
        ];
    }
}
