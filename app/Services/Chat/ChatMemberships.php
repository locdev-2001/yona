<?php

namespace App\Services\Chat;

use App\Exceptions\Chat\ChatActionRefused;
use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\ChatMessage;
use App\Models\User;

// Trạng thái của một người trong hội thoại: chấp nhận/xoá tin chờ, đã đọc, đang gõ.
class ChatMemberships
{
    public function __construct(
        private readonly ChatBroadcaster $broadcaster,
        private readonly ChatPresenter $presenter,
    ) {}

    /** @throws ChatActionRefused */
    public function accept(User $user, Chat $chat): void
    {
        $member = $this->membership($user, $chat);

        if ($member->isPending()) {
            $member->update(['status' => ChatMember::STATUS_ACTIVE]);
        }

        $this->broadcaster->toUser($user, ChatBroadcaster::CHAT_UPDATED, ['chat_id' => $chat->id]);
    }

    // Xoá khỏi danh sách của mình. Không báo cho người kia.
    /** @throws ChatActionRefused */
    public function remove(User $user, Chat $chat): void
    {
        $this->membership($user, $chat)->update(['status' => ChatMember::STATUS_LEFT]);
        $this->broadcaster->toUser($user, ChatBroadcaster::CHAT_UPDATED, ['chat_id' => $chat->id, 'removed' => true]);
    }

    /** @throws ChatActionRefused */
    public function markRead(User $user, Chat $chat, ?int $messageId = null): void
    {
        $member = $this->membership($user, $chat);
        $lastId = $messageId !== null && $chat->messages()->whereKey($messageId)->exists() ? $messageId : $chat->last_message_id;

        if ($lastId === null || ($member->last_read_message_id !== null && $member->last_read_message_id >= $lastId)) {
            return;
        }

        $member->update(['last_read_message_id' => $lastId]);
        $this->broadcaster->toMembers($chat, ChatBroadcaster::READ, ['user_id' => $user->getKey(), 'message_id' => $lastId]);
    }

    /** @throws ChatActionRefused */
    public function typing(User $user, Chat $chat, bool $isTyping): void
    {
        $this->membership($user, $chat);
        $this->broadcaster->toMembers($chat, ChatBroadcaster::TYPING, ['user' => $this->presenter->person($user), 'typing' => $isTyping], except: $user);
    }

    // Ghim và tắt thông báo là trạng thái riêng của từng người, người khác không biết.
    /** @throws ChatActionRefused */
    public function updatePreferences(User $user, Chat $chat, ?bool $pinned, ?bool $muted): void
    {
        $member = $this->membership($user, $chat);
        $changes = array_filter([
            'pinned_at' => $pinned === null ? null : ($pinned ? ($member->pinned_at ?? now()) : false),
            'muted_until' => $muted === null ? null : ($muted ? now()->addYears(100) : false),
        ], fn ($value) => $value !== null);

        $member->update(array_map(fn ($value) => $value === false ? null : $value, $changes));
        $this->broadcaster->toUser($user, ChatBroadcaster::CHAT_UPDATED, ['chat_id' => $chat->id]);
    }

    public function unreadCount(ChatMember $member): int
    {
        return ChatMessage::query()
            ->where('conversation_id', $member->conversation_id)
            ->where('sender_id', '!=', $member->user_id)
            ->when($member->last_read_message_id, fn ($query, $readId) => $query->where('id', '>', $readId))
            ->limit(100)
            ->count();
    }

    /** @throws ChatActionRefused */
    public function membership(User $user, Chat $chat): ChatMember
    {
        $member = $chat->members()->where('user_id', $user->getKey())
            ->whereIn('status', [ChatMember::STATUS_ACTIVE, ChatMember::STATUS_PENDING])
            ->first();

        return $member ?? throw ChatActionRefused::notMember();
    }
}
