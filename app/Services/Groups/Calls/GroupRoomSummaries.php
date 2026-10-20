<?php

namespace App\Services\Groups\Calls;

use App\Models\CallParticipant;
use App\Models\YonaGroup;
use App\Services\Calls\ScreenShares;

// Phòng thoại đang mở của nhóm nhìn từ danh sách hội thoại: ai đang ngồi, ai đang chia sẻ màn
// hình, mở từ lúc nào. Đọc từ quan hệ YonaGroup::openVoiceRoom (danh sách nạp theo lô). Phòng
// đã mở mà chưa ai vào thì chưa tính là đang mở.
final readonly class GroupRoomSummaries
{
    public function __construct(private ScreenShares $screenShares) {}

    /** @return array{call_id: int, started_at: string|null, total: int, participants: list<array{user_id: int, name: string, avatar_url: string|null, is_sharing_screen: bool}>}|null */
    public function of(YonaGroup $group): ?array
    {
        $call = $group->openVoiceRoom;

        if ($call === null || $call->presentParticipants->isEmpty()) {
            return null;
        }

        $sharerIds = $this->screenShares->sharerIds($call);

        return [
            'call_id' => $call->id,
            'started_at' => ($call->started_at ?? $call->created_at)?->toIso8601String(),
            'total' => $call->presentParticipants->count(),
            'participants' => $call->presentParticipants
                ->map(fn (CallParticipant $participant) => [
                    'user_id' => $participant->user_id,
                    'name' => $participant->user->availableName(),
                    'avatar_url' => $participant->user->avatarUrl() ?: null,
                    'is_sharing_screen' => in_array($participant->user_id, $sharerIds, true),
                ])
                ->values()
                ->all(),
        ];
    }
}
