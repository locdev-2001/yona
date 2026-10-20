<?php

namespace App\Services\Yona;

use App\Builders\ContactInboxWithContactBuilder;
use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\Events\ReactionEvent;
use App\Messaging\Inbound\Events\RecallEvent;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Inbound\MessageEventService;
use App\Messaging\Inbound\ReplyReference;
use App\Messaging\Stickers\StickerContent;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\Channel\Yona;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Messaging\MessageReceiptService;
use App\Services\Users\Friendships;

// Chuyển tin giữa hai hộp thư Yona: tin người A gửi trong hội thoại với B thành tin
// đến trong hộp thư Yona của B. Hai bản tin mang chung source_id "yona-msg:{id}" nên
// trả lời, cảm xúc, thu hồi tra được tin tương ứng ở bên kia. Người chưa là bạn bè
// thì tin mở hội thoại chờ ở bên nhận; người nhận đã chặn thì tin không được giao (giữ
// trạng thái `sent`, không lên `delivered`).
class YonaRelay
{
    public function __construct(
        private readonly YonaInboxes $inboxes,
        private readonly InboundMessageWriter $writer,
        private readonly MessageEventService $events,
        private readonly Friendships $friendships,
        private readonly MessageReceiptService $receipts,
    ) {}

    public function deliver(Message $message): void
    {
        $conversation = $message->conversation;
        $recipient = $this->counterpartOf($conversation);
        $sender = $this->inboxes->ownerOf($conversation->inbox);

        if ($recipient === null || $sender === null) {
            return;
        }

        $recipientInbox = $this->inboxes->ensureFor($recipient);

        if ($this->hasBlocked($recipientInbox, $sender)) {
            return;
        }

        $sourceId = Yona::MESSAGE_SOURCE_PREFIX.$message->id;
        $this->writer->write($recipientInbox, $this->senderOf($sender), new InboundMessage(
            sourceId: $sourceId,
            text: $message->content,
            sentAt: $message->created_at,
            sticker: isset($message->content_attributes['sticker']) ? StickerContent::fromPayload($message->content_attributes['sticker']) : null,
            attachments: $message->attachments->map(fn (Attachment $attachment) => $this->attachmentOf($attachment))->filter()->values()->all(),
            replyTo: $this->replyOf($message),
            awaitsAcceptance: ! $this->friendships->areFriends($sender, $recipient->id),
        ));

        $message->update(['source_id' => $sourceId]);
        // Bản tin đã nằm trong hộp thư người nhận: đây là biên nhận "đã giao" chắc chắn của kênh.
        $this->receipts->applyToSourceIds($message->inbox, [$sourceId], MessageReceiptService::DELIVERED);
    }

    // Mở (hoặc lấy lại) hội thoại với một người dùng Yona trong hộp thư Yona của mình.
    public function openWith(Account $account, User $recipient): Conversation
    {
        return IncomingConversationResolver::resolve($this->contactFor($account, $recipient));
    }

    // Người dùng Yona trong hộp thư Yona của account, chưa có thì thêm (chưa mở hội thoại).
    public function contactFor(Account $account, User $person): ?ContactInbox
    {
        return (new ContactInboxWithContactBuilder(
            inbox: $this->inboxes->ensureForAccount($account),
            contactAttributes: $this->senderOf($person)->contactAttributes(),
            sourceId: Yona::contactSourceIdFor($person->id),
        ))->perform();
    }

    public function react(Message $message, ?string $emoji): void
    {
        $this->relayEvent($message, fn (Inbox $inbox, User $actor) => new ReactionEvent(
            targetSourceId: (string) $message->source_id,
            emoji: $emoji,
            actor: Yona::contactSourceIdFor($actor->id),
        ));
    }

    public function recall(Message $message): void
    {
        $this->relayEvent($message, fn () => new RecallEvent((string) $message->source_id));
    }

    // Hai người vừa thành bạn bè: hội thoại người kia đang chờ trong hộp thư mình được mở.
    public function acceptPendingFrom(Account $account, User $person): void
    {
        $this->contactFor($account, $person)?->conversations()
            ->where('status', Conversation::STATUS_PENDING)
            ->get()
            ->each(fn (Conversation $conversation) => $conversation->update(['status' => Conversation::STATUS_OPEN]));
    }

    public function counterpartInbox(Conversation $conversation): ?Inbox
    {
        $recipient = $this->counterpartOf($conversation);

        return $recipient === null ? null : $this->inboxes->ensureFor($recipient);
    }

    public function counterpartOf(Conversation $conversation): ?User
    {
        return User::query()->find(Yona::userIdFromSourceId($conversation->contactInbox?->source_id));
    }

    private function hasBlocked(Inbox $recipientInbox, User $sender): bool
    {
        return ContactInbox::query()
            ->where('inbox_id', $recipientInbox->id)
            ->where('source_id', Yona::contactSourceIdFor($sender->id))
            ->whereHas('contact', fn ($contact) => $contact->where('blocked', true))
            ->exists();
    }

    public function senderOf(User $user): InboundSender
    {
        return new InboundSender(
            sourceId: Yona::contactSourceIdFor($user->id),
            name: $user->availableName(),
            avatarUrl: $user->avatarUrl() ?: null,
            identifier: $user->username !== null ? '@'.$user->username : null,
        );
    }

    private function relayEvent(Message $message, \Closure $event): void
    {
        $recipientInbox = $this->counterpartInbox($message->conversation);
        $actor = $this->inboxes->ownerOf($message->inbox);

        if ($recipientInbox !== null && $actor !== null && filled($message->source_id)) {
            $this->events->apply($recipientInbox, $event($recipientInbox, $actor));
        }
    }

    private function attachmentOf(Attachment $attachment): ?InboundAttachment
    {
        $url = $attachment->pushEventData()['data_url'] ?? null;

        return filled($url)
            ? InboundAttachment::external($url, AttachmentKind::tryFrom($attachment->fileTypeName()) ?? AttachmentKind::File)
            : null;
    }

    private function replyOf(Message $message): ?ReplyReference
    {
        $replied = $message->repliedMessage();

        return $replied !== null && filled($replied->source_id)
            ? new ReplyReference(externalId: $replied->source_id, content: $replied->content)
            : null;
    }
}
