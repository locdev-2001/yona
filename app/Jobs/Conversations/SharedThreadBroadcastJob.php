<?php

namespace App\Jobs\Conversations;

use App\Builders\NotificationBuilder;
use App\Events\EventType;
use App\Events\RealtimeBroadcast;
use App\Http\Resources\MessageResource;
use App\Jobs\ApplicationJob;
use App\Models\Channel\Yona;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Messages\OutboundMentionsBuilder;

/**
 * Tin của hội thoại gốc (tạo mới, cảm xúc, thu hồi) tới dòng riêng của từng thành viên
 * luồng dùng chung, mỗi người một payload mang id hội thoại, account, số chưa đọc của
 * chính dòng đó. Tin mới của người khác mở lại dòng đã đóng như tin đến của hội thoại
 * 1-1 (phát `conversation.status_changed` cho dòng đó); thành viên được nhắc tên hoặc
 * nằm trong @All nhận thông báo nhắc tên ở dòng của mình. Chạy trong hàng đợi vì một nhóm
 * có tới vài trăm thành viên.
 */
class SharedThreadBroadcastJob extends ApplicationJob
{
    /** @param  array<string, mixed>|null  $previousChanges */
    public function __construct(
        public readonly int $messageId,
        public readonly string $eventName,
        public readonly ?array $previousChanges = null,
    ) {
        $this->onQueue('critical');
    }

    public function handle(): void
    {
        $message = Message::query()->with(['attachments', 'sender'])->find($this->messageId);

        if ($message === null) {
            return;
        }

        $views = Conversation::query()
            ->where('thread_conversation_id', $message->conversation_id)
            ->whereHas('threadMembership', fn ($membership) => $membership->whereNull('left_at'))
            ->with(['account', 'inbox', 'threadConversation', 'threadMembership.user'])
            ->get();
        Conversation::preloadUnreadIncomingMessagesCounts($views);

        foreach ($views as $view) {
            if ($this->opensViewOf($message, $view)) {
                $view->reopenForNewMessage();
                $this->notifyIfMentioned($message, $view);
            }

            $token = $view->threadMembership?->user?->pubsub_token;

            if ($token === null) {
                continue;
            }

            broadcast(new RealtimeBroadcast([$token], $this->eventName, [
                ...MessageResource::pushEventData($view->presentMessage($message)),
                ...($this->previousChanges !== null ? ['previous_changes' => $this->previousChanges] : []),
                'account_id' => $view->account_id,
            ]));
        }
    }

    private function notifyIfMentioned(Message $message, Conversation $view): void
    {
        $viewer = $view->threadMembership?->user;

        if ($viewer === null) {
            return;
        }

        $mentionedIds = array_column(array_filter((array) ($message->content_attributes['mentions'] ?? []), 'is_array'), 'external_id');

        if (array_intersect([OutboundMentionsBuilder::EVERYONE, Yona::contactSourceIdFor($viewer->id)], $mentionedIds) === []) {
            return;
        }

        (new NotificationBuilder('conversation_mention', $viewer, $view->account, $view, $message))->perform();
    }

    private function opensViewOf(Message $message, Conversation $view): bool
    {
        return $this->eventName === EventType::MESSAGE_CREATED->value
            && $message->message_type !== Message::TYPE_ACTIVITY
            && ! ($message->sender_type === (new User)->getMorphClass() && (int) $message->sender_id === $view->threadViewerId());
    }
}
