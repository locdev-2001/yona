<?php

namespace App\Services\Chat;

use App\Exceptions\Chat\ChatActionRefused;
use App\Messaging\Reactions\ReactionEmoji;
use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Collection;

// Thao tác trên một tin đã gửi: thả cảm xúc, sửa, thu hồi, tìm. Mọi thay đổi phát
// chat.message.updated với payload tin mới cho cả hội thoại.
class ChatMessageActions
{
    private const SEARCH_LIMIT = 30;

    public function __construct(
        private readonly ChatMemberships $memberships,
        private readonly ChatBroadcaster $broadcaster,
        private readonly ChatPresenter $presenter,
    ) {}

    // Mỗi người giữ đúng một cảm xúc trên một tin: thả lại đúng emoji đó là gỡ.
    /** @throws ChatActionRefused */
    public function react(User $user, Chat $chat, ChatMessage $message, string $emoji): ChatMessage
    {
        $this->ensureInChat($user, $chat, $message);
        $emoji = (string) ReactionEmoji::normalize($emoji);
        $by = (string) $user->getKey();
        $reactions = collect($message->content_attributes['reactions'] ?? []);
        $previous = $reactions->firstWhere('by', $by);
        $reactions = $reactions->reject(fn ($reaction) => ($reaction['by'] ?? null) === $by)->values();

        if (($previous['emoji'] ?? null) !== $emoji) {
            $reactions->push(['emoji' => $emoji, 'by' => $by, 'at' => now()->getTimestamp()]);
        }

        return $this->save($chat, $message, ['content_attributes' => [...($message->content_attributes ?? []), 'reactions' => $reactions->all()]]);
    }

    /** @throws ChatActionRefused */
    public function edit(User $user, Chat $chat, ChatMessage $message, string $content): ChatMessage
    {
        $this->ensureOwnMessage($user, $chat, $message);
        $content = trim($content);

        if ($content === '' || $message->content_type !== Message::CONTENT_TYPES['text'] || $message->content === null) {
            throw ChatActionRefused::messageNotEditable();
        }

        return $this->save($chat, $message, [
            'content' => $content,
            'edited_at' => now(),
            'content_attributes' => [...($message->content_attributes ?? []), 'edited' => true],
        ]);
    }

    /** @throws ChatActionRefused */
    public function recall(User $user, Chat $chat, ChatMessage $message): ChatMessage
    {
        $this->ensureOwnMessage($user, $chat, $message);
        $message->attachments()->get()->each->delete();

        return $this->save($chat, $message, [
            'content' => null,
            'content_attributes' => [...($message->content_attributes ?? []), 'deleted' => true],
        ]);
    }

    /** @return Collection<int, ChatMessage> */
    public function search(User $user, Chat $chat, string $query): Collection
    {
        $this->memberships->membership($user, $chat);
        $needle = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], trim($query)).'%';

        return $chat->messages()
            ->with('sender')
            ->where('message_type', ChatMessage::TYPE_USER)
            ->where('content', 'ilike', $needle)
            ->orderByDesc('id')
            ->limit(self::SEARCH_LIMIT)
            ->get();
    }

    /** @param array<string, mixed> $changes */
    private function save(Chat $chat, ChatMessage $message, array $changes): ChatMessage
    {
        $message->update($changes);
        $message->load(['sender', 'attachments']);
        $this->broadcaster->toMembers($chat, ChatBroadcaster::MESSAGE_UPDATED, [
            'message' => $this->presenter->message($message, inGroup: $chat->isGroup()),
        ]);

        return $message;
    }

    /** @throws ChatActionRefused */
    private function ensureInChat(User $user, Chat $chat, ChatMessage $message): void
    {
        $this->memberships->membership($user, $chat);

        if ($message->conversation_id !== $chat->id || $message->isRecalled() || $message->message_type === ChatMessage::TYPE_SYSTEM) {
            throw ChatActionRefused::messageNotEditable();
        }
    }

    /** @throws ChatActionRefused */
    private function ensureOwnMessage(User $user, Chat $chat, ChatMessage $message): void
    {
        $this->ensureInChat($user, $chat, $message);

        if ($message->sender_id !== $user->getKey()) {
            throw ChatActionRefused::notAllowed();
        }
    }
}
