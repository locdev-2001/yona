<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Services\Messages\MentionService;

// Port từ refs/chatwoot/app/listeners/notification_listener.rb — mới chỉ nhánh
// message_created → MentionService. Các nhánh dựng Notification
// (conversation_creation / assignment / mention) chờ model Notification (D2).
class NotificationListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::MESSAGE_CREATED) {
            return;
        }

        [$message] = $this->extractMessageAndAccount($event);

        (new MentionService($message))->perform();
    }
}
