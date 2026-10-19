<?php

namespace App\Services\Users;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Friendship;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

// Lời mời kết bạn và danh sách bạn bè giữa người dùng Yona. Chỉ người đã chọn
// username mới kết bạn được. Kênh nào cần biết hai người vừa thành bạn bè thì nghe
// DomainEvent FRIENDSHIP_ACCEPTED, lớp này không biết tới kênh.
class Friendships
{
    public const STATE_NONE = 'none';

    public const STATE_OUTGOING = 'outgoing';

    public const STATE_INCOMING = 'incoming';

    public const STATE_FRIENDS = 'friends';

    public function __construct(private readonly UserDirectory $directory) {}

    // Gửi lời mời; người kia đã mời mình trước thì coi như chấp nhận luôn.
    public function request(User $requester, User $addressee): Friendship
    {
        if ($requester->is($addressee)) {
            throw ValidationException::withMessages(['user_id' => __('friends.ERRORS.SELF')]);
        }

        if ($requester->username === null || $addressee->username === null) {
            throw ValidationException::withMessages(['user_id' => __('friends.ERRORS.NO_USERNAME')]);
        }

        $existing = $this->between($requester, $addressee->id);

        if ($existing !== null) {
            return $existing->isAccepted() || $existing->requester_id === $requester->id
                ? $existing
                : $this->accept($existing, $requester);
        }

        try {
            $friendship = Friendship::query()->create([
                'requester_id' => $requester->id,
                'addressee_id' => $addressee->id,
                'status' => Friendship::STATUS_PENDING,
            ]);
        } catch (UniqueConstraintViolationException) {
            return $this->request($requester, $addressee);
        }

        DomainEvent::dispatch(EventType::FRIENDSHIP_REQUESTED, ['friendship' => $friendship]);

        return $friendship;
    }

    public function accept(Friendship $friendship, User $addressee): Friendship
    {
        if ($friendship->addressee_id !== $addressee->id) {
            abort(403);
        }

        if ($friendship->isAccepted()) {
            return $friendship;
        }

        $friendship->update(['status' => Friendship::STATUS_ACCEPTED, 'accepted_at' => now()]);
        DomainEvent::dispatch(EventType::FRIENDSHIP_ACCEPTED, ['friendship' => $friendship]);

        return $friendship;
    }

    // Từ chối, huỷ lời mời đã gửi và huỷ kết bạn đều là xoá quan hệ.
    public function remove(Friendship $friendship, User $actor): void
    {
        if (! $friendship->involves($actor)) {
            abort(403);
        }

        $friendship->delete();
    }

    public function find(User $viewer, int $friendshipId): Friendship
    {
        return Friendship::query()->involving($viewer->id)->findOrFail($friendshipId);
    }

    public function between(User $user, int $otherUserId): ?Friendship
    {
        return Friendship::query()->between($user->id, $otherUserId)->first();
    }

    /** @return list<int> */
    public function friendIds(User $user): array
    {
        return Friendship::query()->accepted()->involving($user->id)->get()
            ->map(fn (Friendship $friendship) => $friendship->otherUserId($user))
            ->values()
            ->all();
    }

    /** @return array{state: string, friendship_id: int|null, friends_since: string|null} */
    public function stateWith(User $viewer, int $otherUserId): array
    {
        $friendship = $this->between($viewer, $otherUserId);

        return [
            'state' => $this->stateOf($friendship, $viewer),
            'friendship_id' => $friendship?->id,
            'friends_since' => $friendship?->accepted_at?->toISOString(),
        ];
    }

    /** @return array{incoming: Collection<int, array<string, mixed>>, outgoing: Collection<int, array<string, mixed>>} */
    public function pendingFor(User $user): array
    {
        $pending = Friendship::query()->pending()->involving($user->id)
            ->with(['requester.avatar', 'addressee.avatar'])
            ->latest('id')
            ->get();

        $card = fn (Friendship $friendship, User $person) => [
            'id' => $friendship->id,
            'created_at' => $friendship->created_at->toISOString(),
            'person' => $this->directory->card($person),
        ];

        return [
            'incoming' => $pending->where('addressee_id', $user->id)->map(fn (Friendship $friendship) => $card($friendship, $friendship->requester))->values(),
            'outgoing' => $pending->where('requester_id', $user->id)->map(fn (Friendship $friendship) => $card($friendship, $friendship->addressee))->values(),
        ];
    }

    private function stateOf(?Friendship $friendship, User $viewer): string
    {
        return match (true) {
            $friendship === null => self::STATE_NONE,
            $friendship->isAccepted() => self::STATE_FRIENDS,
            $friendship->requester_id === $viewer->id => self::STATE_OUTGOING,
            default => self::STATE_INCOMING,
        };
    }
}
