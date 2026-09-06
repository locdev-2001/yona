<?php

namespace App\Listeners;

use App\Builders\NotificationBuilder;
use App\Events\DomainEvent;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\User;
use App\Services\Messages\MentionService;
use App\Services\Messages\NewMessageNotificationService;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/listeners/notification_listener.rb — MỘT điểm quyết
// định: mọi sự kiện miền vào đây, rẽ nhánh theo tên event rồi đưa cho
// NotificationBuilder. Không rải if theo từng nơi phát sinh sự kiện.
class NotificationListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        $method = Str::camel($event->methodName());

        if (method_exists($this, $method)) {
            $this->{$method}($event);
        }
    }

    public function conversationCreated(DomainEvent $event): void
    {
        $this->notifyInboxMembers($event);
    }

    public function conversationBotHandoff(DomainEvent $event): void
    {
        $this->notifyInboxMembers($event);
    }

    public function assigneeChanged(DomainEvent $event): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);
        $assignee = $conversation->currentAssignee();

        // Đổi team làm assignee về null vẫn bắn assignee.changed — không có người
        // để báo thì dừng, khỏi tạo job rỗng. `blank()` của Laravel coi false là
        // KHÔNG rỗng (khác `false.blank?` của Ruby) nên phải kiểm giá trị đúng nghĩa.
        if ($assignee === null || ($event->data['notifiable_assignee_change'] ?? false) !== true) {
            return;
        }

        if ($conversation->status === Conversation::STATUS_PENDING) {
            return;
        }

        $this->build('conversation_assignment', $assignee, $account, $conversation);
    }

    public function messageCreated(DomainEvent $event): void
    {
        [$message] = $this->extractMessageAndAccount($event);

        (new MentionService($message))->perform();
        (new NewMessageNotificationService($message))->perform();
    }

    private function notifyInboxMembers(DomainEvent $event): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);

        if ($conversation->status === Conversation::STATUS_PENDING) {
            return;
        }

        $conversation->inbox->members()->get()
            ->each(fn (User $agent) => $this->build('conversation_creation', $agent, $account, $conversation));
    }

    private function build(string $notificationType, User $user, Account $account, Conversation $conversation): void
    {
        (new NotificationBuilder($notificationType, $user, $account, $conversation))->perform();
    }
}
