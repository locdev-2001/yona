<?php

namespace App\Services\Chat;

use App\Exceptions\Chat\ChatActionRefused;
use App\Messaging\Stickers\StickerContent;
use App\Models\Attachment;
use App\Models\Chat;
use App\Models\ChatMember;
use App\Models\ChatMessage;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\User;
use App\Notifications\ChatMessageNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

// Đường gửi tin duy nhất của hội thoại giữa người dùng: kiểm quyền, ghi tin, cập
// nhật hội thoại, phát realtime và thông báo đẩy.
class ChatMessageSender
{
    public function __construct(
        private readonly UserBlocks $blocks,
        private readonly ChatBroadcaster $broadcaster,
        private readonly ChatPresenter $presenter,
    ) {}

    /** @throws ChatActionRefused */
    /**
     * @param  list<array{external_id: string|int, name: string, offset: int, length: int}>  $mentions
     *
     * @throws ChatActionRefused
     */
    public function sendText(User $sender, Chat $chat, string $content, ?string $clientId = null, ?int $replyToId = null, array $mentions = []): ChatMessage
    {
        $content = trim($content);

        if ($content === '') {
            throw ChatActionRefused::emptyMessage();
        }

        $attributes = $replyToId !== null && $this->belongsToChat($chat, $replyToId) ? ['in_reply_to' => $replyToId] : [];
        $mentions = $this->memberMentions($chat, $mentions);

        if ($mentions !== []) {
            $attributes['mentions'] = $mentions;
        }

        return $this->send($sender, $chat, [
            'content' => $content,
            'content_type' => Message::CONTENT_TYPES['text'],
            'content_attributes' => $attributes,
        ], $clientId);
    }

    /**
     * Ảnh/file kèm chú thích tuỳ chọn: mỗi tệp một đính kèm của cùng một tin.
     *
     * @param  list<UploadedFile>  $files
     *
     * @throws ChatActionRefused
     */
    public function sendFiles(User $sender, Chat $chat, array $files, ?string $caption = null, ?string $clientId = null, ?int $replyToId = null): ChatMessage
    {
        $attributes = $replyToId !== null && $this->belongsToChat($chat, $replyToId) ? ['in_reply_to' => $replyToId] : [];
        $stored = array_map(fn (UploadedFile $file) => Attachment::storeUpload($file, null), $files);

        return $this->send($sender, $chat, [
            'content' => filled($caption) ? trim((string) $caption) : null,
            'content_type' => Message::CONTENT_TYPES['text'],
            'content_attributes' => $attributes,
        ], $clientId, $stored);
    }

    /** @throws ChatActionRefused */
    public function sendSticker(User $sender, Chat $chat, Sticker $sticker, ?string $clientId = null): ChatMessage
    {
        $content = new StickerContent(id: $sticker->id, imageUrl: $sticker->image_url, packId: $sticker->sticker_pack_id);

        return $this->send($sender, $chat, [
            'content' => null,
            'content_type' => Message::CONTENT_TYPES['sticker'],
            'content_attributes' => ['sticker' => $content->payload()],
        ], $clientId, [['file_type' => Attachment::FILE_TYPE_IMAGE, 'external_url' => $sticker->image_url]]);
    }

    /**
     * Chuyển tiếp: tin mới mang lại nội dung và bản sao đính kèm của tin gốc.
     *
     * @throws ChatActionRefused
     */
    public function forward(User $sender, ChatMessage $original, Chat $target): ChatMessage
    {
        if ($original->isRecalled() || $original->message_type === ChatMessage::TYPE_SYSTEM) {
            throw ChatActionRefused::notAllowed();
        }

        $attachments = $original->attachments
            ->map(fn (Attachment $attachment) => $attachment->copyStoredFile()
                ?? array_filter(['file_type' => $attachment->file_type, 'external_url' => $attachment->external_url]))
            ->filter()
            ->values()
            ->all();

        return $this->send($sender, $target, [
            'content' => $original->content,
            'content_type' => $original->content_type,
            'content_attributes' => array_intersect_key($original->content_attributes ?? [], ['sticker' => true]) + ['forwarded' => true],
        ], null, $attachments);
    }

    /**
     * @param  array{content: ?string, content_type: int, content_attributes: array<string, mixed>}  $payload
     * @param  list<array<string, mixed>>  $attachments
     *
     * @throws ChatActionRefused
     */
    public function send(User $sender, Chat $chat, array $payload, ?string $clientId = null, array $attachments = []): ChatMessage
    {
        if ($chat->isDirect()) {
            $chat->loadMissing('members.user');
            $chat->members->each(fn (ChatMember $member) => $member->user && app(DirectChats::class)->restoreHidden($chat, $member->user));
        }

        $chat->loadMissing('members.user');
        $membership = $chat->memberFor($sender);

        if ($membership === null || ! ($membership->isActive() || $membership->isPending())) {
            throw ChatActionRefused::notMember();
        }

        if ($chat->isDirect() && ($counterpart = $chat->members->firstWhere('user_id', '!=', $sender->getKey())?->user)
            && $this->blocks->isBlockedBetween($sender, $counterpart)) {
            throw ChatActionRefused::blocked();
        }

        if ($clientId !== null && ($duplicate = $chat->messages()->where('client_id', $clientId)->first())) {
            return $duplicate;
        }

        $message = DB::transaction(function () use ($sender, $chat, $membership, $payload, $clientId, $attachments) {
            // Trả lời trong hộp tin chờ nghĩa là chấp nhận hội thoại.
            if ($membership->isPending()) {
                $membership->update(['status' => ChatMember::STATUS_ACTIVE]);
            }

            $message = $chat->messages()->create([
                ...$payload,
                'message_type' => ChatMessage::TYPE_USER,
                'sender_type' => 'User',
                'sender_id' => $sender->getKey(),
                'client_id' => $clientId,
            ]);

            foreach ($attachments as $attachment) {
                $message->attachments()->create($attachment);
            }

            $chat->update(['last_message_id' => $message->getKey(), 'last_activity_at' => $message->created_at]);
            $membership->update(['last_read_message_id' => $message->getKey()]);

            return $message;
        });

        $message->setRelation('sender', $sender);
        $this->broadcaster->toMembers($chat, ChatBroadcaster::MESSAGE_CREATED, ['message' => $this->presenter->message($message, inGroup: $chat->isGroup())]);
        $this->notifyRecipients($chat, $sender, $message);

        return $message;
    }

    // Tin hệ thống của nhóm ("A đã thêm B"): không người gửi, không thông báo đẩy.
    /** @param array<string, mixed> $attributes */
    public function sendSystem(Chat $chat, string $content, array $attributes = []): ChatMessage
    {
        $message = DB::transaction(function () use ($chat, $content, $attributes) {
            $message = $chat->messages()->create([
                'content' => $content,
                'content_type' => Message::CONTENT_TYPES['text'],
                'content_attributes' => $attributes,
                'message_type' => ChatMessage::TYPE_SYSTEM,
            ]);

            $chat->update(['last_message_id' => $message->getKey(), 'last_activity_at' => $message->created_at]);

            return $message;
        });

        $this->broadcaster->toMembers($chat, ChatBroadcaster::MESSAGE_CREATED, ['message' => $this->presenter->message($message)]);

        return $message;
    }

    // Người được @ vẫn nhận thông báo dù đã tắt thông báo nhóm.
    private function notifyRecipients(Chat $chat, User $sender, ChatMessage $message): void
    {
        $mentionedIds = collect($message->content_attributes['mentions'] ?? [])->pluck('external_id')->map(fn ($id) => (int) $id);

        $chat->members
            ->filter(fn (ChatMember $member) => $member->user_id !== $sender->getKey() && $member->isActive())
            ->filter(fn (ChatMember $member) => ! $member->isMuted() || $mentionedIds->contains($member->user_id))
            ->each(fn (ChatMember $member) => $member->user?->notify(new ChatMessageNotification($chat, $sender, $message)));
    }

    /**
     * @param  list<array<string, mixed>>  $mentions
     * @return list<array{external_id: string, name: string, offset: int, length: int}>
     */
    private function memberMentions(Chat $chat, array $mentions): array
    {
        if (! $chat->isGroup() || $mentions === []) {
            return [];
        }

        $memberIds = $chat->members()->where('status', ChatMember::STATUS_ACTIVE)->pluck('user_id')->map(fn ($id) => (string) $id);

        return collect($mentions)
            ->filter(fn ($mention) => is_array($mention) && $memberIds->contains((string) ($mention['external_id'] ?? '')))
            ->map(fn ($mention) => [
                'external_id' => (string) $mention['external_id'],
                'name' => (string) ($mention['name'] ?? ''),
                'offset' => (int) ($mention['offset'] ?? 0),
                'length' => (int) ($mention['length'] ?? 0),
            ])
            ->values()
            ->all();
    }

    private function belongsToChat(Chat $chat, int $messageId): bool
    {
        return $chat->messages()->whereKey($messageId)->exists();
    }
}
