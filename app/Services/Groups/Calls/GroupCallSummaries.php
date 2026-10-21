<?php

namespace App\Services\Groups\Calls;

use App\Models\Call;
use App\Models\CallParticipant;
use App\Models\User;
use App\Models\YonaGroup;
use Illuminate\Contracts\Cache\Repository as Cache;

// Cuộc gọi nhóm đang diễn ra nhìn từ danh sách, mũ khung chat và màn đổ chuông: ai gọi, thoại hay
// video, ai đang ở trong cuộc gọi. Ảnh chụp cache theo nhóm, xoá mỗi khi cuộc gọi đổi
// (GroupCallSignals); `as_of` đóng trước khi đọc để client so với sự kiện realtime. Trạng thái lời
// mời của từng người không nằm trong ảnh chụp chung.
final readonly class GroupCallSummaries
{
    private const SNAPSHOT_TTL_SECONDS = 60;

    public function __construct(
        private GroupCalls $groupCalls,
        private Cache $cache,
    ) {}

    /** @return array{as_of: int, group_call: array<string, mixed>|null} */
    public function snapshot(YonaGroup $group): array
    {
        return $this->cache->remember($this->key($group->id), self::SNAPSHOT_TTL_SECONDS, function () use ($group): array {
            $asOf = now()->getTimestampMs();
            $call = $this->groupCalls->liveCallOf($group);

            return ['as_of' => $asOf, 'group_call' => $call === null ? null : $this->summarize($call)];
        });
    }

    public function forget(int $groupId): void
    {
        $this->cache->forget($this->key($groupId));
    }

    /** @return array<string, mixed> */
    private function summarize(Call $call): array
    {
        $caller = User::query()->find($call->caller_id);
        $present = $call->presentParticipants()->orderBy('joined_at')->with('user')->get();

        return [
            'call_id' => $call->id,
            'status' => $call->status->value,
            'media' => $call->media->value,
            'caller' => $caller === null ? null : self::person($caller),
            'ringing_since' => $call->created_at?->toIso8601String(),
            'answered_at' => $call->answered_at?->toIso8601String(),
            'total' => $present->count(),
            'participants' => $present->map(fn (CallParticipant $participant) => self::person($participant->user))->values()->all(),
        ];
    }

    /** @return array{user_id: int, name: string, avatar_url: string|null} */
    private static function person(User $user): array
    {
        return ['user_id' => $user->id, 'name' => $user->availableName(), 'avatar_url' => $user->avatarUrl() ?: null];
    }

    private function key(int $groupId): string
    {
        return "groups:{$groupId}:group-call";
    }
}
