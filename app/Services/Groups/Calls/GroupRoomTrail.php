<?php

namespace App\Services\Groups\Calls;

use App\Models\Call;
use App\Services\Calls\Kinds\CallTrail;
use App\Services\Groups\GroupService;
use Carbon\CarbonInterval;

// Dấu vết phòng thoại trong hội thoại nhóm: một tin khi người đầu tiên vào, một tin khi phòng
// đóng (thời lượng, số người đã tham gia). Chỉ ghi mới, không sửa tin cũ. Sự kiện phòng đến
// từ webhook, không có ngôn ngữ người dùng: tin viết theo ngôn ngữ account của nhóm.
final readonly class GroupRoomTrail implements CallTrail
{
    private const DURATION_PARTS = 2;

    public function __construct(private GroupService $groups) {}

    public function roomStarted(Call $call): void
    {
        $opener = $call->participants()->with('user')->orderBy('joined_at')->first()?->user;

        $this->groups->postNotice($call->group, __('calls.ACTIVITY.ROOM_STARTED', ['actor' => $opener?->availableName() ?? ''], $this->localeOf($call)), [
            'call' => ['id' => $call->id, 'kind' => $call->kind, 'status' => $call->status->value],
        ]);
    }

    public function roomFinished(Call $call): void
    {
        if ($call->started_at === null) {
            return;
        }

        $durationSeconds = (int) $call->started_at->diffInSeconds($call->ended_at);
        $participantCount = $call->participants()->distinct()->count('user_id');

        $locale = $this->localeOf($call);
        $this->groups->postNotice($call->group, __('calls.ACTIVITY.ROOM_ENDED', [
            'duration' => CarbonInterval::seconds($durationSeconds)->cascade()->locale($locale)->forHumans(['parts' => self::DURATION_PARTS]),
            'count' => $participantCount,
        ], $locale), [
            'call' => [
                'id' => $call->id,
                'kind' => $call->kind,
                'status' => $call->status->value,
                'duration_seconds' => $durationSeconds,
                'participants' => $participantCount,
            ],
        ]);
    }

    private function localeOf(Call $call): string
    {
        return $call->group->account?->locale ?: app()->getLocale();
    }
}
