<?php

namespace App\Services\Chat;

use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Support\Collection;

// Danh sách hội thoại và trang tin của một người dùng.
class ChatInbox
{
    public const TAB_ALL = 'all';

    public const TAB_REQUESTS = 'requests';

    public const PAGE_SIZE = 25;

    public const MESSAGES_PAGE_SIZE = 30;

    /** @return Collection<int, Chat> */
    public function chats(User $user, string $tab, ?int $beforeActivity = null): Collection
    {
        $status = $tab === self::TAB_REQUESTS ? ChatMember::STATUS_PENDING : ChatMember::STATUS_ACTIVE;

        return Chat::query()
            ->whereIn('id', ChatMember::query()->where('user_id', $user->getKey())->where('status', $status)->select('conversation_id'))
            ->when($tab === self::TAB_REQUESTS, fn ($query) => $query->whereNotNull('last_message_id'))
            ->when($beforeActivity, fn ($query, $before) => $query->where('last_activity_at', '<', now()->setTimestamp($before)))
            ->with(['members.user', 'lastMessage.sender'])
            ->orderByDesc('last_activity_at')
            ->orderByDesc('id')
            ->limit(self::PAGE_SIZE)
            ->get();
    }

    public function requestCount(User $user): int
    {
        return ChatMember::query()
            ->where('user_id', $user->getKey())
            ->where('status', ChatMember::STATUS_PENDING)
            ->whereHas('chat', fn ($chat) => $chat->whereNotNull('last_message_id'))
            ->count();
    }

    /** @return Collection<int, ChatMessage> tin cũ → mới */
    public function messages(Chat $chat, ?int $beforeId = null): Collection
    {
        return $chat->messages()
            ->with('sender')
            ->when($beforeId, fn ($query, $before) => $query->where('id', '<', $before))
            ->orderByDesc('platform_sent_at')
            ->orderByDesc('id')
            ->limit(self::MESSAGES_PAGE_SIZE)
            ->get()
            ->reverse()
            ->values();
    }
}
