<?php

namespace App\Services\Chat;

use App\Exceptions\Chat\ChatActionRefused;
use App\Models\Chat;
use App\Models\ChatInviteLink;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Mỗi nhóm có một link mời đang dùng; tạo lại thì link cũ hết hiệu lực.
class GroupInviteLinks
{
    public function __construct(
        private readonly GroupChats $groups,
        private readonly GroupPolicy $policy,
    ) {}

    public function current(Chat $chat): ?ChatInviteLink
    {
        return $chat->inviteLinks()->whereNull('revoked_at')->latest('id')->get()->first(fn (ChatInviteLink $link) => $link->isUsable());
    }

    /** @throws ChatActionRefused */
    public function rotate(User $actor, Chat $chat): ChatInviteLink
    {
        $this->policy->authorize($this->policy->canManageInviteLink($this->groups->groupMember($actor, $chat)));

        return DB::transaction(function () use ($actor, $chat) {
            $chat->inviteLinks()->whereNull('revoked_at')->update(['revoked_at' => now()]);

            return $chat->inviteLinks()->create(['token' => Str::random(32), 'created_by' => $actor->getKey()]);
        });
    }

    /** @throws ChatActionRefused */
    public function revoke(User $actor, Chat $chat): void
    {
        $this->policy->authorize($this->policy->canManageInviteLink($this->groups->groupMember($actor, $chat)));
        $chat->inviteLinks()->whereNull('revoked_at')->update(['revoked_at' => now()]);
    }

    /** @throws ChatActionRefused */
    public function join(User $user, string $token): Chat
    {
        $link = ChatInviteLink::query()->where('token', $token)->with('chat')->first();
        $chat = $link?->chat;

        if ($link === null || $chat === null || ! $chat->isGroup() || ! $link->isUsable()) {
            throw ChatActionRefused::inviteLinkInvalid();
        }

        if ($chat->activeMembers()->where('user_id', $user->getKey())->exists()) {
            return $chat;
        }

        $this->groups->join($chat, collect([$user]), $link->creator);
        $link->increment('uses');
        $this->groups->announce($chat, 'JOINED_BY_LINK', ['name' => $user->availableName()]);

        return $chat;
    }

    public function url(ChatInviteLink $link): string
    {
        return route('chat.join', $link->token);
    }
}
