<?php

namespace App\Services\Chat;

use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\ChatMessage;
use App\Models\Message;
use App\Models\User;

// Dựng payload JSON cho giao diện nhắn tin, cùng khuôn với payload hội thoại/tin
// của hộp thư để các component hiện có dùng lại được.
// Tin không phụ thuộc người xem (một payload phát cho mọi thành viên); giao diện
// so sender_id với người đang đăng nhập để biết tin của mình hay của người khác.
class ChatPresenter
{
    /** @return array<string, mixed> */
    // Tin nhóm mang người gửi trong content_attributes.sender: bong bóng hiện tên
    // người gửi phía trên, như tin nhóm của mọi kênh.
    public function message(ChatMessage $message, ?int $readUpToId = null, bool $inGroup = false): array
    {
        $sender = $message->sender;
        $sentAt = $message->platform_sent_at ?? $message->created_at;
        $attributes = $message->content_attributes ?? [];

        if ($inGroup && $sender !== null) {
            $attributes['sender'] = ['external_id' => (string) $sender->id, 'name' => $sender->availableName(), 'avatar' => $sender->avatarUrl()];
        }

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'content' => $message->isRecalled() ? null : $message->content,
            'content_type' => $this->contentTypeName($message->content_type),
            'content_attributes' => $attributes,
            'message_type' => $message->message_type,
            'status' => $readUpToId !== null && $message->id <= $readUpToId ? 'read' : 'sent',
            'private' => false,
            'source_id' => null,
            'created_at' => $message->created_at?->getTimestamp(),
            'platform_sent_at' => $sentAt?->getTimestamp(),
            'edited_at' => $message->edited_at?->getTimestamp(),
            'sender_type' => $sender ? 'User' : null,
            'sender_id' => $message->sender_id,
            'sender' => $sender ? $this->person($sender) : null,
            'echo_id' => $message->client_id,
            'attachments' => [],
        ];
    }

    /** @return array<string, mixed> */
    public function chat(Chat $chat, User $viewer, ChatMemberships $memberships): array
    {
        $chat->loadMissing(['members.user', 'lastMessage.sender']);
        $membership = $chat->memberFor($viewer);
        $counterpart = $chat->isDirect() ? $chat->members->firstWhere('user_id', '!=', $viewer->getKey())?->user : null;
        $blocks = $counterpart !== null
            ? app(UserBlocks::class)->relation($viewer, $counterpart)
            : ['blocked_by_me' => false, 'blocked_either' => false];
        $readUpTo = $this->readUpToFor($chat, $viewer);
        $isMember = $membership !== null && ($membership->isActive() || $membership->isPending());

        return [
            'id' => $chat->id,
            'uuid' => $chat->uuid,
            'kind' => $chat->isDirect() ? 'direct' : 'group',
            'title' => $chat->isDirect() ? $counterpart?->availableName() : $chat->title,
            'description' => $chat->description,
            'meta' => [
                'sender' => $counterpart !== null
                    ? $this->person($counterpart)
                    : ['id' => 0, 'name' => $chat->title, 'thumbnail' => $chat->avatarUrl()],
            ],
            'member_count' => $chat->member_count,
            'my_role' => $chat->isGroup() && $membership ? $membership->roleName() : null,
            'abilities' => $chat->isGroup() && $membership?->isActive() ? app(GroupPolicy::class)->abilities($membership) : null,
            'member_status' => $membership?->isPending() ? 'pending' : 'active',
            'can_reply' => $isMember && ! $blocks['blocked_either'],
            'blocked_by_me' => $blocks['blocked_by_me'],
            'muted' => $membership?->isMuted() ?? false,
            'pinned' => $membership?->pinned_at !== null,
            'unread_count' => $membership ? $memberships->unreadCount($membership) : 0,
            'last_read_message_id' => $membership?->last_read_message_id,
            'counterpart_last_read_message_id' => $readUpTo,
            'last_non_activity_message' => $chat->lastMessage ? $this->message($chat->lastMessage, $readUpTo, $chat->isGroup()) : null,
            'last_activity_at' => $chat->last_activity_at?->getTimestamp(),
            'timestamp' => $chat->last_activity_at?->getTimestamp(),
            'created_at' => $chat->created_at?->getTimestamp(),
        ];
    }

    /** @return array<string, mixed> */
    public function member(ChatMember $member): array
    {
        return [...$this->person($member->user), 'role' => $member->roleName(), 'joined_at' => $member->joined_at?->getTimestamp()];
    }

    /** @return array<string, mixed> */
    public function person(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->availableName(),
            'available_name' => $user->availableName(),
            'username' => $user->username,
            'thumbnail' => $user->avatarUrl(),
            'type' => 'user',
        ];
    }

    public function preview(ChatMessage $message): string
    {
        if ($message->isRecalled()) {
            return __('chat.PREVIEW.RECALLED');
        }

        return match ($this->contentTypeName($message->content_type)) {
            'sticker' => __('chat.PREVIEW.STICKER'),
            'bank_transfer' => __('chat.PREVIEW.BANK_TRANSFER'),
            default => (string) $message->content,
        };
    }

    private function contentTypeName(int $contentType): string
    {
        return array_flip(Message::CONTENT_TYPES)[$contentType] ?? 'text';
    }

    // Tin tới id này người kia đã xem (hội thoại 1-1), để hiện dấu đã xem.
    public function readUpToFor(Chat $chat, User $viewer): ?int
    {
        return $chat->isDirect()
            ? $chat->members->firstWhere('user_id', '!=', $viewer->getKey())?->last_read_message_id
            : null;
    }
}
