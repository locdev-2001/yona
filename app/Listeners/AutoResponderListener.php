<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Services\Conversations\ConversationAutoResponder;

// Người trả lời công khai trên hội thoại đang tự động (trong Yona, hoặc thẳng trên
// ứng dụng của kênh — lõi không chặn được) thì hội thoại chuyển sang thủ công.
class AutoResponderListener extends BaseListener
{
    public function __construct(private readonly ConversationAutoResponder $autoResponder) {}

    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::MESSAGE_CREATED) {
            return;
        }

        [$message] = $this->extractMessageAndAccount($event);

        $this->autoResponder->handOverToHumanAfter($message);
    }
}
