<?php

namespace App\Services\Groups\Calls;

use App\Models\Call;
use App\Models\CallParticipant;
use App\Models\YonaGroup;
use App\Models\YonaGroupVoiceRoom;
use App\Services\Calls\ScreenShares;
use Illuminate\Contracts\Cache\Repository as Cache;

// Các phòng thoại của nhóm nhìn từ hộp thư: tên phòng, và với phòng đang mở thì ai đang ngồi, ai
// đang chia sẻ màn hình, mở từ lúc nào. Phòng đã mở mà chưa ai vào thì chưa tính là đang mở. Ảnh
// chụp cache theo nhóm (mọi dòng nhóm của 500 thành viên dùng chung một lần tính), xoá khi trong
// phòng có thay đổi (GroupRoomPresence) hay danh sách phòng đổi (GroupVoiceRooms); `as_of` đóng
// trước khi đọc để client so với sự kiện realtime.
final readonly class GroupRoomSummaries
{
    private const SNAPSHOT_TTL_SECONDS = 60;

    public function __construct(
        private GroupVoiceRooms $rooms,
        private ScreenShares $screenShares,
        private Cache $cache,
    ) {}

    /** @return array{as_of: int, voice_rooms: list<array{id: int, name: string|null, live: array<string, mixed>|null}>} */
    public function snapshot(YonaGroup $group): array
    {
        return $this->cache->remember(self::key($group->id), self::SNAPSHOT_TTL_SECONDS, function () use ($group): array {
            $asOf = now()->getTimestampMs();
            $rooms = $this->rooms->of($group)
                ->load(['openCall.presentParticipants' => fn ($query) => $query->orderBy('joined_at')->with('user.avatar')]);

            return [
                'as_of' => $asOf,
                'voice_rooms' => $rooms->map(fn (YonaGroupVoiceRoom $room) => [
                    'id' => $room->id,
                    'name' => $room->name,
                    'live' => $this->summarize($room->liveCall()),
                ])->values()->all(),
            ];
        });
    }

    public static function key(int $groupId): string
    {
        return "groups:{$groupId}:voice-rooms";
    }

    public function forget(int $groupId): void
    {
        $this->cache->forget(self::key($groupId));
    }

    /** @return array{call_id: int, started_at: string|null, total: int, participants: list<array<string, mixed>>}|null */
    private function summarize(?Call $call): ?array
    {
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
