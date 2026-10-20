<?php

namespace App\Services\Groups\Calls;

use App\Models\CallParticipant;
use App\Models\YonaGroup;
use App\Services\Calls\ScreenShares;
use Illuminate\Contracts\Cache\Repository as Cache;

// Phòng thoại đang mở của nhóm nhìn từ danh sách hội thoại: ai đang ngồi, ai đang chia sẻ màn
// hình, mở từ lúc nào. Phòng đã mở mà chưa ai vào thì chưa tính là đang mở. Ảnh chụp cache theo
// nhóm (mọi dòng nhóm của 500 thành viên dùng chung một lần tính), xoá khi trong phòng có thay
// đổi (GroupRoomPresence); `as_of` đóng trước khi đọc để client so với sự kiện realtime.
final readonly class GroupRoomSummaries
{
    private const SNAPSHOT_TTL_SECONDS = 60;

    public function __construct(
        private ScreenShares $screenShares,
        private Cache $cache,
    ) {}

    /** @return array{as_of: int, voice_room: array<string, mixed>|null} */
    public function snapshot(YonaGroup $group): array
    {
        return $this->cache->remember($this->key($group->id), self::SNAPSHOT_TTL_SECONDS, function () use ($group): array {
            $asOf = now()->getTimestampMs();

            return ['as_of' => $asOf, 'voice_room' => $this->summarize($group->load('openVoiceRoom'))];
        });
    }

    /** @return array{call_id: int, started_at: string|null, total: int, participants: list<array{user_id: int, name: string, avatar_url: string|null, is_sharing_screen: bool}>}|null */
    public function of(YonaGroup $group): ?array
    {
        return $this->snapshot($group)['voice_room'];
    }

    public function forget(int $groupId): void
    {
        $this->cache->forget($this->key($groupId));
    }

    private function summarize(YonaGroup $group): ?array
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

    private function key(int $groupId): string
    {
        return "groups:{$groupId}:voice-room";
    }
}
