<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\Conversations\AcceptMessageRequestJob;
use App\Models\Conversation;
use App\Services\Channels\ChannelActionRegistry;

/**
 * Hội thoại rời trạng thái chờ sang mở (bấm "Chấp nhận", bật lại từ danh sách, hay hai
 * người vừa thành bạn) thì kênh có thư mục tin nhắn chờ phía nền tảng cũng được báo.
 * Lõi không biết kênh nào có thư mục đó — ChannelActionRegistry trả lời.
 */
class MessageRequestAcceptanceListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::CONVERSATION_OPENED) {
            return;
        }

        [$conversation] = $this->extractConversationAndAccount($event);

        if (! $this->leftPending($conversation) || ChannelActionRegistry::messageRequestsFor($conversation->inbox) === null) {
            return;
        }

        AcceptMessageRequestJob::dispatch($conversation);
    }

    private function leftPending(Conversation $conversation): bool
    {
        return (int) ($conversation->getPrevious()['status'] ?? -1) === Conversation::STATUS_PENDING;
    }
}
