<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Services\Conversations\ConversationAutoResponder;

// Người trả lời công khai trên hội thoại đang tự động (trong Yona, hoặc thẳng trên
// ứng dụng của kênh — lõi không chặn được) thì hội thoại chuyển sang thủ công. Gán hội
// thoại cho một nhân viên thì hội thoại AI đã chuyển cho người thôi chờ người.
class AutoResponderListener extends BaseListener
{
    public function __construct(private readonly ConversationAutoResponder $autoResponder) {}

    public function handle(DomainEvent $event): void
    {
        if ($event->type === EventType::ASSIGNEE_CHANGED) {
            [$conversation] = $this->extractConversationAndAccount($event);
            $this->autoResponder->humanTookOver($conversation);

            return;
        }

        if ($event->type !== EventType::MESSAGE_CREATED) {
            return;
        }

        [$message] = $this->extractMessageAndAccount($event);

        $this->autoResponder->handOverToHumanAfter($message);
    }
}
