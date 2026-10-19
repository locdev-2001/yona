<?php

namespace App\Services\Chat;

use App\Exceptions\Chat\ChatActionRefused;
use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\User;
use App\Services\Users\PrivacySettings;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Nhóm phẳng: tạo, sửa thông tin, thêm/xoá người, đổi vai trò, rời và giải tán.
// Mọi kiểm quyền đi qua GroupPolicy; mọi sự kiện thành viên để lại một tin hệ thống.
class GroupChats
{
    public function __construct(
        private readonly GroupPolicy $policy,
        private readonly ChatMemberships $memberships,
        private readonly ChatMessageSender $sender,
        private readonly ChatBroadcaster $broadcaster,
        private readonly UserBlocks $blocks,
    ) {}

    /**
     * @param  list<int>  $memberIds
     *
     * @throws ChatActionRefused
     */
    public function create(User $owner, string $title, array $memberIds, ?UploadedFile $avatar = null): Chat
    {
        $invitees = $this->addableUsers($owner, $memberIds);

        if ($invitees->count() < GroupPolicy::MIN_INVITEES) {
            throw ChatActionRefused::groupTooSmall(GroupPolicy::MIN_INVITEES);
        }

        $this->policy->ensureCapacity(1, $invitees->count());

        $chat = DB::transaction(function () use ($owner, $title, $invitees) {
            $chat = Chat::query()->create([
                'kind' => Chat::KIND_GROUP,
                'title' => $title,
                'created_by' => $owner->getKey(),
                'member_count' => $invitees->count() + 1,
                'last_activity_at' => now(),
            ]);

            $chat->members()->create(['user_id' => $owner->getKey(), 'role' => ChatMember::ROLE_OWNER, 'joined_at' => now()]);
            $invitees->each(fn (User $user) => $chat->members()->create([
                'user_id' => $user->getKey(),
                'joined_at' => now(),
                'invited_by' => $owner->getKey(),
            ]));

            return $chat;
        });

        if ($avatar !== null) {
            $chat->replaceAvatar($avatar);
        }

        $this->announce($chat, 'CREATED', ['actor' => $owner->availableName(), 'title' => $title]);

        return $chat->refresh();
    }

    /** @throws ChatActionRefused */
    public function updateInfo(User $actor, Chat $chat, ?string $title, ?string $description, ?UploadedFile $avatar, bool $removeAvatar = false): Chat
    {
        $member = $this->groupMember($actor, $chat);
        $this->policy->authorize($this->policy->canEditInfo($member));

        if ($title !== null && $title !== $chat->title) {
            $chat->update(['title' => $title]);
            $this->announce($chat, 'RENAMED', ['actor' => $actor->availableName(), 'title' => $title]);
        }

        if ($description !== null) {
            $chat->update(['description' => $description]);
        }

        if ($avatar !== null) {
            $chat->replaceAvatar($avatar);
            $this->announce($chat, 'AVATAR_CHANGED', ['actor' => $actor->availableName()]);
        } elseif ($removeAvatar) {
            $chat->removeAvatar();
        }

        $this->broadcaster->toMembers($chat, ChatBroadcaster::CHAT_UPDATED, []);

        return $chat->refresh();
    }

    /**
     * Người đã tắt "cho phép thêm vào nhóm" hoặc đang chặn nhau với người thêm thì bị bỏ qua.
     *
     * @param  list<int>  $userIds
     * @return Collection<int, User> những người đã được thêm
     *
     * @throws ChatActionRefused
     */
    public function addMembers(User $actor, Chat $chat, array $userIds): Collection
    {
        $member = $this->groupMember($actor, $chat);
        $this->policy->authorize($this->policy->canAddMembers($member));

        $currentIds = $chat->activeMembers()->pluck('user_id')->all();
        $users = $this->addableUsers($actor, array_values(array_diff($userIds, $currentIds)));

        if ($users->isEmpty()) {
            return $users;
        }

        $this->join($chat, $users, $actor);
        $this->announce($chat, 'ADDED', [
            'actor' => $actor->availableName(),
            'names' => $users->map->availableName()->join(', '),
        ]);

        return $users;
    }

    /** @throws ChatActionRefused */
    public function removeMember(User $actor, Chat $chat, User $target): void
    {
        $member = $this->groupMember($actor, $chat);
        $targetMember = $this->groupMember($target, $chat);
        $this->policy->authorize($this->policy->canRemove($member, $targetMember));

        $this->detach($chat, $targetMember, ChatMember::STATUS_REMOVED);
        $this->announce($chat, 'REMOVED', ['actor' => $actor->availableName(), 'name' => $target->availableName()]);
    }

    /** @throws ChatActionRefused */
    public function changeRole(User $actor, Chat $chat, User $target, int $role): void
    {
        $member = $this->groupMember($actor, $chat);
        $targetMember = $this->groupMember($target, $chat);
        $this->policy->authorize($this->policy->canChangeRole($member, $targetMember));

        if ($targetMember->role === $role) {
            return;
        }

        DB::transaction(function () use ($member, $targetMember, $role) {
            if ($role === ChatMember::ROLE_OWNER) {
                $member->update(['role' => ChatMember::ROLE_ADMIN]);
            }

            $targetMember->update(['role' => $role]);
        });

        $event = match ($role) {
            ChatMember::ROLE_OWNER => 'OWNER_TRANSFERRED',
            ChatMember::ROLE_ADMIN => 'ADMIN_ADDED',
            default => 'ADMIN_REMOVED',
        };
        $this->announce($chat, $event, ['actor' => $actor->availableName(), 'name' => $target->availableName()]);
    }

    // Trưởng nhóm rời đi thì quyền chuyển cho phó nhóm vào sớm nhất, không có phó
    // nhóm thì cho thành viên vào sớm nhất; không còn ai thì nhóm giải tán.
    /** @throws ChatActionRefused */
    public function leave(User $user, Chat $chat): void
    {
        $member = $this->groupMember($user, $chat);

        $successor = DB::transaction(function () use ($chat, $member) {
            $this->detach($chat, $member, ChatMember::STATUS_LEFT);

            if (! $member->isOwner()) {
                return null;
            }

            $member->update(['role' => ChatMember::ROLE_MEMBER]);
            $successor = $chat->activeMembers()->with('user')
                ->orderByDesc('role')
                ->orderBy('joined_at')
                ->orderBy('id')
                ->first();
            $successor?->update(['role' => ChatMember::ROLE_OWNER]);

            return $successor;
        });

        if ($chat->activeMembers()->doesntExist()) {
            $chat->delete();

            return;
        }

        $this->announce($chat, 'LEFT', ['name' => $user->availableName()]);

        if ($successor?->user !== null) {
            $this->announce($chat, 'OWNER_INHERITED', ['name' => $successor->user->availableName()]);
        }
    }

    /** @throws ChatActionRefused */
    public function dissolve(User $actor, Chat $chat): void
    {
        $member = $this->groupMember($actor, $chat);
        $this->policy->authorize($this->policy->canDissolve($member));

        $this->broadcaster->toMembers($chat, ChatBroadcaster::CHAT_UPDATED, ['removed' => true]);
        $chat->delete();
    }

    /** @return Collection<int, ChatMember> */
    public function members(User $viewer, Chat $chat): Collection
    {
        $this->groupMember($viewer, $chat);

        return $chat->activeMembers()->with('user')->orderByDesc('role')->orderBy('joined_at')->get();
    }

    /** @throws ChatActionRefused */
    public function groupMember(User $user, Chat $chat): ChatMember
    {
        if (! $chat->isGroup()) {
            throw ChatActionRefused::notAllowed();
        }

        $member = $this->memberships->membership($user, $chat);

        return $member->isActive() ? $member : throw ChatActionRefused::notMember();
    }

    /**
     * Thêm vào nhóm, kể cả người từng rời hoặc bị xoá. Khoá hàng nhóm để hai lượt thêm
     * cùng lúc không vượt trần thành viên.
     *
     * @param  Collection<int, User>  $users
     *
     * @throws ChatActionRefused
     */
    public function join(Chat $chat, Collection $users, ?User $invitedBy): void
    {
        DB::transaction(function () use ($chat, $users, $invitedBy) {
            $locked = Chat::query()->whereKey($chat->getKey())->lockForUpdate()->firstOrFail();
            $this->policy->ensureCapacity($locked->activeMembers()->count(), $users->count());

            $users->each(fn (User $user) => ChatMember::query()->updateOrCreate(
                ['conversation_id' => $chat->getKey(), 'user_id' => $user->getKey()],
                [
                    'role' => ChatMember::ROLE_MEMBER,
                    'status' => ChatMember::STATUS_ACTIVE,
                    'joined_at' => now(),
                    'invited_by' => $invitedBy?->getKey(),
                    'last_read_message_id' => $chat->last_message_id,
                ],
            ));

            $this->syncMemberCount($chat);
        });

        $users->each(fn (User $user) => $this->broadcaster->toUser($user, ChatBroadcaster::CHAT_UPDATED, ['chat_id' => $chat->id]));
    }

    /** @param array<string, string> $replacements */
    public function announce(Chat $chat, string $event, array $replacements): void
    {
        $this->sender->sendSystem($chat, __("chat.SYSTEM.{$event}", $replacements), ['system_event' => strtolower($event)]);
        $this->broadcaster->toMembers($chat, ChatBroadcaster::CHAT_UPDATED, []);
    }

    private function detach(Chat $chat, ChatMember $member, int $status): void
    {
        $member->update(['status' => $status]);
        $this->syncMemberCount($chat);
        $this->broadcaster->toUser($member->user ?? User::query()->findOrFail($member->user_id), ChatBroadcaster::CHAT_UPDATED, ['chat_id' => $chat->id, 'removed' => true]);
    }

    private function syncMemberCount(Chat $chat): void
    {
        $count = $chat->activeMembers()->count();
        Chat::query()->whereKey($chat->getKey())->update(['member_count' => $count]);
        $chat->setRawAttributes([...$chat->getAttributes(), 'member_count' => $count], sync: true);
    }

    /**
     * @param  list<int>  $userIds
     * @return Collection<int, User>
     */
    private function addableUsers(User $actor, array $userIds): Collection
    {
        return User::query()
            ->whereIn('id', array_unique($userIds))
            ->whereKeyNot($actor->getKey())
            ->get()
            ->filter(fn (User $user) => PrivacySettings::resolve($user->privacy)['group_add'] === PrivacySettings::GROUP_ADD_EVERYONE)
            ->reject(fn (User $user) => $this->blocks->isBlockedBetween($actor, $user))
            ->values();
    }
}
