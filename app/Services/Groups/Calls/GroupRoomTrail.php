<?php

namespace App\Services\Groups\Calls;

use App\Models\Call;
use App\Models\CallParticipant;
use App\Models\User;
use App\Services\Calls\Kinds\CallTrail;
use App\Services\Groups\GroupService;
use Carbon\CarbonInterval;

// Dấu vết phòng thoại trong hội thoại nhóm: một tin khi người đầu tiên vào, phòng đóng thì chính
// tin đó đổi thành thời lượng, ai đã tham gia (giữ người mở phòng làm người gửi). Tin nhóm lưu một bản chung cho
// mọi thành viên nên lời hiển thị dịch theo người đọc từ `content_attributes.call`; `content` chỉ
// là bản ngôn ngữ mặc định cho tìm kiếm và nơi chưa đọc dữ liệu có cấu trúc. Tin đóng phòng ghi đủ
// người đã vào (phòng tối đa 25) để hộp chi tiết liệt kê; thẻ tự cắt hàng avatar.
final readonly class GroupRoomTrail implements CallTrail
{
    private const DURATION_PARTS = 2;

    public function __construct(private GroupService $groups) {}

    public function roomStarted(Call $call): void
    {
        $opener = $call->participants()->with('user')->orderBy('joined_at')->first()?->user;
        $locale = (string) config('app.locale');

        $this->groups->postCallNotice($call->group, __('calls.ACTIVITY.ROOM_STARTED', ['actor' => $opener?->availableName() ?? ''], $locale), [
            'id' => $call->id,
            'kind' => $call->kind,
            'status' => $call->status->value,
            'actor' => $opener === null ? null : ['user_id' => $opener->id, 'name' => $opener->availableName()],
        ], $opener);
    }

    public function roomFinished(Call $call): void
    {
        if ($call->started_at === null) {
            return;
        }

        $durationSeconds = (int) $call->started_at->diffInSeconds($call->ended_at);
        $attendees = $call->participants()->with('user')->orderBy('joined_at')->get()
            ->map(fn (CallParticipant $participant) => $participant->user)
            ->filter()
            ->unique('id')
            ->values();
        $locale = (string) config('app.locale');

        $this->groups->postCallNotice($call->group, trans_choice('calls.ACTIVITY.ROOM_ENDED', $attendees->count(), [
            'duration' => CarbonInterval::seconds($durationSeconds)->cascade()->locale($locale)->forHumans(['parts' => self::DURATION_PARTS]),
            'count' => $attendees->count(),
        ], $locale), [
            'id' => $call->id,
            'kind' => $call->kind,
            'status' => $call->status->value,
            'duration_seconds' => $durationSeconds,
            'started_at' => $call->started_at->toIso8601String(),
            'ended_at' => $call->ended_at?->toIso8601String(),
            'participants' => $attendees->count(),
            'attendees' => $attendees->map(fn (User $user) => [
                'user_id' => $user->id,
                'name' => $user->availableName(),
                'avatar_url' => $user->avatarUrl() ?: null,
            ])->all(),
        ], $attendees->first());
    }
}
