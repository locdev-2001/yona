<?php

namespace App\Services\Groups;

use App\Builders\ContactInboxWithContactBuilder;
use App\Events\EventType;
use App\Exceptions\GroupActionRejected;
use App\Jobs\ActionCableBroadcastJob;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Models\YonaGroup;
use App\Models\YonaGroupInviteLink;
use App\Models\YonaGroupMember;
use App\Services\Users\Friendships;
use App\Services\Yona\YonaInboxes;
use App\Support\GeneratedAvatarConfig;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Vòng đời nhóm giữa người dùng Yona: tạo, thêm, rời, đưa ra, đổi vai trò, đổi tên, link
 * mời. Mỗi thay đổi thành viên để lại một tin hoạt động trong hội thoại gốc, cả nhóm thấy.
 * Thêm trực tiếp chỉ được bạn bè của người thêm; link mời thì ai có link cũng vào.
 */
final class GroupService
{
    public const NAME_MAX_LENGTH = 100;

    public function __construct(
        private readonly YonaInboxes $inboxes,
        private readonly Friendships $friendships,
        private readonly GroupPermissions $permissions,
    ) {}

    /** @param  list<int>  $memberIds */
    public function create(User $creator, string $name, array $memberIds): YonaGroup
    {
        $name = $this->cleanName($name);
        $people = $this->addablePeople($creator, $memberIds);

        if ($people->count() + 1 > YonaGroup::MAX_MEMBERS) {
            throw new GroupActionRejected('FULL', replace: ['max' => YonaGroup::MAX_MEMBERS]);
        }

        return DB::transaction(function () use ($creator, $name, $people) {
            $host = Account::query()->create(['name' => $name]);
            $hostInbox = $this->inboxes->ensureForAccount($host);
            $groupId = (int) DB::selectOne("SELECT nextval('yona_groups_id_seq') AS id")->id;
            $contactInbox = $this->groupContact($hostInbox, $groupId, $name);

            $thread = Conversation::query()->create([
                'account_id' => $host->id,
                'inbox_id' => $hostInbox->id,
                'status' => Conversation::STATUS_OPEN,
                'contact_id' => $contactInbox->contact_id,
                'contact_inbox_id' => $contactInbox->id,
            ]);

            $group = new YonaGroup([
                'account_id' => $host->id,
                'conversation_id' => $thread->id,
                'name' => $name,
                'created_by_id' => $creator->id,
            ]);
            $group->id = $groupId;
            $group->save();

            $this->join($group, $creator, YonaGroupMember::ROLE_ADMIN, YonaGroupMember::JOINED_AS_CREATOR);
            $this->postActivity($group, 'CREATED', ['actor' => $creator->availableName(), 'name' => $name]);
            $this->addPeople($group, $creator, $people);

            return $group->refresh();
        });
    }

    /**
     * @param  list<int>  $memberIds
     * @return Collection<int, YonaGroupMember>
     */
    public function addMembers(YonaGroup $group, User $actor, array $memberIds): Collection
    {
        $this->permissions->activeMember($group, $actor);
        $people = $this->addablePeople($actor, $memberIds)
            ->reject(fn (User $person) => $group->activeMemberFor($person) !== null)
            ->values();

        return DB::transaction(fn () => $this->addPeople($group, $actor, $people));
    }

    public function leave(YonaGroup $group, User $user): void
    {
        $member = $this->permissions->activeMember($group, $user);

        DB::transaction(function () use ($group, $member, $user) {
            $this->handOverAdminIfLast($group, $member);
            $this->markLeft($group, $member);
            $this->postActivity($group, 'LEFT', ['member' => $user->availableName()]);
        });
    }

    public function remove(YonaGroup $group, User $admin, int $userId): void
    {
        $this->permissions->admin($group, $admin);

        if ($userId === $admin->id) {
            $this->leave($group, $admin);

            return;
        }

        $member = $this->activeMemberById($group, $userId);

        DB::transaction(function () use ($group, $member, $admin) {
            $this->markLeft($group, $member);
            $this->postActivity($group, 'REMOVED', ['actor' => $admin->availableName(), 'member' => $member->user->availableName()]);
        });
    }

    public function setRole(YonaGroup $group, User $admin, int $userId, string $role): YonaGroupMember
    {
        $this->permissions->admin($group, $admin);

        if (! in_array($role, [YonaGroupMember::ROLE_ADMIN, YonaGroupMember::ROLE_MEMBER], true)) {
            throw new GroupActionRejected('INVALID_ROLE');
        }

        $member = $this->activeMemberById($group, $userId);

        if ($member->role === $role) {
            return $member;
        }

        if ($role === YonaGroupMember::ROLE_MEMBER && ! $this->hasOtherAdmin($group, $member)) {
            throw new GroupActionRejected('LAST_ADMIN');
        }

        return DB::transaction(function () use ($group, $member, $admin, $role) {
            $member->update(['role' => $role]);
            $this->postActivity($group, $role === YonaGroupMember::ROLE_ADMIN ? 'MADE_ADMIN' : 'REMOVED_ADMIN', [
                'actor' => $admin->availableName(),
                'member' => $member->user->availableName(),
            ]);

            return $member;
        });
    }

    public function rename(YonaGroup $group, User $admin, string $name): YonaGroup
    {
        $this->permissions->admin($group, $admin);
        $name = $this->cleanName($name);

        if ($name === $group->name) {
            return $group;
        }

        return DB::transaction(function () use ($group, $admin, $name) {
            $group->update(['name' => $name]);
            $group->account->update(['name' => $name]);
            // Qua model để mỗi hộp thư nhận `contact.updated`: danh sách và tiêu đề đổi tên ngay.
            Contact::query()
                ->whereIn('id', ContactInbox::query()->where('source_id', YonaGroup::contactSourceIdFor($group->id))->select('contact_id'))
                ->get()
                ->each(fn (Contact $contact) => $contact->update(['name' => $name]));
            $this->postActivity($group, 'RENAMED', ['actor' => $admin->availableName(), 'name' => $name]);

            return $group;
        });
    }

    // Hình khối tự chỉnh (tên + các trục đã ghim); tên null = quay về avatar ghép ảnh thành viên.
    // Chọn hình nào cũng gỡ ảnh đã tải lên.
    public function changeAvatar(YonaGroup $group, User $admin, ?string $avatarSeed, mixed $avatarTraits = null): YonaGroup
    {
        $this->permissions->admin($group, $admin);

        if ($avatarSeed !== null && ! GeneratedAvatarConfig::isValidName($avatarSeed)) {
            throw new GroupActionRejected('INVALID_AVATAR');
        }

        try {
            $traits = $avatarSeed === null ? null : GeneratedAvatarConfig::sanitizeTraits($avatarTraits);
        } catch (InvalidArgumentException) {
            throw new GroupActionRejected('INVALID_AVATAR');
        }

        if ($avatarSeed === $group->avatar_seed && $traits == $group->avatar_traits && $group->avatar === null) {
            return $group;
        }

        return DB::transaction(function () use ($group, $admin, $avatarSeed, $traits) {
            $group->avatar_seed = $avatarSeed;
            $group->avatar_traits = $traits;
            $group->removeAvatar();
            $group->save();
            $this->postActivity($group, 'AVATAR_CHANGED', ['actor' => $admin->availableName()]);

            return $group;
        });
    }

    public function uploadAvatar(YonaGroup $group, User $admin, UploadedFile $photo): YonaGroup
    {
        $this->permissions->admin($group, $admin);

        return DB::transaction(function () use ($group, $admin, $photo) {
            $group->avatar_seed = null;
            $group->avatar_traits = null;
            $group->replaceAvatar($photo);
            $group->save();
            $this->postActivity($group, 'AVATAR_CHANGED', ['actor' => $admin->availableName()]);

            return $group;
        });
    }

    /** @return array{0: YonaGroupInviteLink, 1: string} */
    public function issueInviteLink(YonaGroup $group, User $admin, ?int $expiresInDays, ?int $maxUses): array
    {
        $this->permissions->admin($group, $admin);

        // Mỗi nhóm chỉ một link đang dùng: link mới thay link cũ.
        return DB::transaction(function () use ($group, $admin, $expiresInDays, $maxUses) {
            $group->inviteLinks()->whereNull('revoked_at')->update(['revoked_at' => now()]);

            return YonaGroupInviteLink::issue($group, $admin, $expiresInDays, $maxUses);
        });
    }

    public function revokeInviteLink(YonaGroup $group, User $admin, int $linkId): void
    {
        $this->permissions->admin($group, $admin);

        $group->inviteLinks()->whereKey($linkId)->whereNull('revoked_at')->update(['revoked_at' => now()]);
    }

    // Nhóm của một link còn dùng được, để trang mời xem trước trước khi bấm Tham gia.
    public function groupForInvite(string $token): YonaGroup
    {
        return $this->usableInviteLink($token)->group;
    }

    public function acceptInvite(string $token, User $user): YonaGroupMember
    {
        if ($user->username === null) {
            throw new GroupActionRejected('NO_USERNAME');
        }

        return DB::transaction(function () use ($token, $user) {
            $link = $this->usableInviteLink($token, lock: true);
            $group = $link->group;
            $existing = $group->activeMemberFor($user);

            if ($existing !== null) {
                return $existing;
            }

            $member = $this->join($group, $user, YonaGroupMember::ROLE_MEMBER, YonaGroupMember::JOINED_BY_INVITE_LINK, inviteLink: $link);
            $link->increment('use_count');
            $this->postActivity($group, 'JOINED_BY_LINK', ['member' => $user->availableName()]);

            return $member;
        });
    }

    /**
     * @param  Collection<int, User>  $people
     * @return Collection<int, YonaGroupMember>
     */
    private function addPeople(YonaGroup $group, User $actor, Collection $people): Collection
    {
        $members = $people->map(fn (User $person) => $this->join($group, $person, YonaGroupMember::ROLE_MEMBER, YonaGroupMember::JOINED_BY_ADD, $actor));

        if ($people->isNotEmpty()) {
            $this->postActivity($group, 'ADDED', [
                'actor' => $actor->availableName(),
                'members' => $people->map(fn (User $person) => $person->availableName())->join(', '),
            ]);
        }

        return $members;
    }

    // Vào nhóm, kể cả vào lại sau khi đã rời: dòng hội thoại cũ được dùng lại để giữ lịch sử.
    private function join(YonaGroup $group, User $user, string $role, string $joinedVia, ?User $addedBy = null, ?YonaGroupInviteLink $inviteLink = null): YonaGroupMember
    {
        $locked = YonaGroup::query()->whereKey($group->id)->lockForUpdate()->firstOrFail();

        if ($locked->member_count >= YonaGroup::MAX_MEMBERS) {
            throw new GroupActionRejected('FULL', replace: ['max' => YonaGroup::MAX_MEMBERS]);
        }

        $attributes = [
            'role' => $role,
            'joined_via' => $joinedVia,
            'added_by_id' => $addedBy?->id,
            'yona_group_invite_link_id' => $inviteLink?->id,
            'left_at' => null,
        ];
        $member = $group->members()->where('user_id', $user->id)->first();

        if ($member !== null) {
            $member->update($attributes);
            $member->conversation->update(['status' => Conversation::STATUS_OPEN]);
        } else {
            $member = $group->members()->create([
                ...$attributes,
                'user_id' => $user->id,
                'conversation_id' => $this->openView($group, $this->inboxes->ensureFor($user))->id,
            ]);
        }

        $group->increment('member_count');

        return $member;
    }

    private function openView(YonaGroup $group, Inbox $inbox): Conversation
    {
        $contactInbox = $this->groupContact($inbox, $group->id, $group->name);

        $view = new Conversation([
            'account_id' => $inbox->account_id,
            'inbox_id' => $inbox->id,
            'status' => Conversation::STATUS_OPEN,
            'contact_id' => $contactInbox->contact_id,
            'contact_inbox_id' => $contactInbox->id,
        ]);
        $view->forceFill(['thread_conversation_id' => $group->conversation_id])->save();

        return $view;
    }

    private function groupContact(Inbox $inbox, int $groupId, string $name): ContactInbox
    {
        return (new ContactInboxWithContactBuilder($inbox, ['name' => $name], YonaGroup::contactSourceIdFor($groupId)))->perform();
    }

    private function markLeft(YonaGroup $group, YonaGroupMember $member): void
    {
        $member->update(['left_at' => now()]);
        $group->decrement('member_count');
    }

    // Quản trị cuối cùng rời nhóm thì thành viên vào lâu nhất lên làm quản trị.
    private function handOverAdminIfLast(YonaGroup $group, YonaGroupMember $leaving): void
    {
        if (! $leaving->isAdmin() || $this->hasOtherAdmin($group, $leaving)) {
            return;
        }

        $successor = $group->activeMembers()->whereKeyNot($leaving->id)->orderBy('created_at')->orderBy('id')->first();

        if ($successor === null) {
            return;
        }

        $successor->update(['role' => YonaGroupMember::ROLE_ADMIN]);
        $this->postActivity($group, 'ADMIN_HANDOVER', ['member' => $successor->user->availableName()]);
    }

    private function hasOtherAdmin(YonaGroup $group, YonaGroupMember $member): bool
    {
        return $group->activeMembers()->where('role', YonaGroupMember::ROLE_ADMIN)->whereKeyNot($member->id)->exists();
    }

    private function activeMemberById(YonaGroup $group, int $userId): YonaGroupMember
    {
        return $group->activeMembers()->with('user')->where('user_id', $userId)->first()
            ?? throw new GroupActionRejected('MEMBER_NOT_FOUND', 404);
    }

    /**
     * Người được thêm trực tiếp: có @username và là bạn bè của người thêm.
     *
     * @param  list<int>  $memberIds
     * @return Collection<int, User>
     */
    private function addablePeople(User $actor, array $memberIds): Collection
    {
        $ids = collect($memberIds)->map(fn ($id) => (int) $id)->reject(fn (int $id) => $id === $actor->id)->unique()->values();
        $people = User::query()->whereIn('id', $ids)->whereNotNull('username')->get();

        if ($people->count() !== $ids->count()) {
            throw new GroupActionRejected('USER_NOT_FOUND');
        }

        $friendIds = array_flip($this->friendships->friendIds($actor));

        if ($people->contains(fn (User $person) => ! isset($friendIds[$person->id]))) {
            throw new GroupActionRejected('NOT_FRIEND');
        }

        return $people->values();
    }

    private function usableInviteLink(string $token, bool $lock = false): YonaGroupInviteLink
    {
        $link = YonaGroupInviteLink::query()
            ->where('token_digest', YonaGroupInviteLink::hashToken($token))
            ->when($lock, fn ($query) => $query->lockForUpdate())
            ->with('group')
            ->first();

        if ($link === null || ! $link->isUsable()) {
            throw new GroupActionRejected('INVITE_UNUSABLE', 404);
        }

        return $link;
    }

    private function cleanName(string $name): string
    {
        $name = trim($name);

        if ($name === '') {
            throw new GroupActionRejected('NAME_REQUIRED');
        }

        if (mb_strlen($name) > self::NAME_MAX_LENGTH) {
            throw new GroupActionRejected('NAME_TOO_LONG');
        }

        return $name;
    }

    /**
     * Mỗi thay đổi của nhóm để lại một tin hoạt động trong hội thoại gốc, rồi báo dòng
     * nhóm của mọi thành viên (cả người vừa rời) đọc lại tên, số thành viên, vai trò.
     *
     * @param  array<string, string>  $replace
     */
    private function postActivity(YonaGroup $group, string $key, array $replace): void
    {
        $thread = $group->conversation;

        $thread->messages()->create([
            'account_id' => $thread->account_id,
            'inbox_id' => $thread->inbox_id,
            'message_type' => Message::TYPE_ACTIVITY,
            'content' => __('groups.ACTIVITY.'.$key, $replace),
        ]);

        DB::afterCommit(fn () => $this->refreshMemberRows($group));
    }

    private function refreshMemberRows(YonaGroup $group): void
    {
        $group->members()->with(['user:id,pubsub_token', 'conversation:id,account_id,display_id'])->get()
            ->each(fn (YonaGroupMember $member) => ActionCableBroadcastJob::dispatch(
                [$member->user->pubsub_token],
                EventType::CONVERSATION_UPDATED->value,
                ['account_id' => $member->conversation->account_id, 'id' => $member->conversation->display_id],
            ));
    }
}
