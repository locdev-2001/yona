<?php

namespace App\Listeners;

use App\Builders\FriendshipNotificationBuilder;
use App\Builders\NotificationBuilder;
use App\Events\DomainEvent;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;
use App\Services\Messages\MentionService;
use App\Services\Messages\NewMessageNotificationService;
use Illuminate\Support\Str;

// MỘT điểm quyết
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
        $this->notifyInboxOwner($event);
    }

    public function conversationBotHandoff(DomainEvent $event): void
    {
        $this->notifyInboxOwner($event);
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

        if ($conversation->status === Conversation::STATUS_PENDING || $this->isAutomaticAssignmentOfReadConversation($event, $conversation, $assignee)) {
            return;
        }

        $this->build('conversation_assignment', $assignee, $account, $conversation);
    }

    // Chính sách phân công rải dần hàng tồn: hội thoại người được giao đã đọc hết thì giao
    // lặng lẽ, không dựng lại chuông vừa "đánh dấu tất cả đã đọc". Người giao tay thì vẫn báo.
    // agent_last_seen_at dùng chung mọi nhân viên, nên phải thêm dấu vết của chính người được
    // giao: đã có thông báo về hội thoại này và đã đọc hết.
    private function isAutomaticAssignmentOfReadConversation(DomainEvent $event, Conversation $conversation, User $assignee): bool
    {
        if (($event->data['performed_by'] ?? null) instanceof User) {
            return false;
        }

        if ($conversation->agent_last_seen_at === null || $conversation->unreadIncomingMessagesCount() > 0) {
            return false;
        }

        $assigneeNotifications = Notification::query()
            ->where('user_id', $assignee->id)
            ->where('primary_actor_type', $conversation->getMorphClass())
            ->where('primary_actor_id', $conversation->id);

        return $assigneeNotifications->exists() && ! $assigneeNotifications->clone()->whereNull('read_at')->exists();
    }

    public function friendshipRequested(DomainEvent $event): void
    {
        $friendship = $event->data['friendship'];

        (new FriendshipNotificationBuilder('friend_request', $friendship->addressee, $friendship))->perform();
    }

    // Lời mời đã trả lời xong: thông báo mời của người nhận thành đã đọc, người gửi được báo lại.
    public function friendshipAccepted(DomainEvent $event): void
    {
        $friendship = $event->data['friendship'];

        Notification::markAllRead($friendship->notifications()->getQuery()->where('user_id', $friendship->addressee_id));
        (new FriendshipNotificationBuilder('friend_request_accepted', $friendship->requester, $friendship))->perform();
    }

    public function messageCreated(DomainEvent $event): void
    {
        [$message] = $this->extractMessageAndAccount($event);

        (new MentionService($message))->perform();
        (new NewMessageNotificationService($message))->perform();
    }

    // Báo hội thoại mới bằng loại conversation_assignment: tuỳ chọn email/push đã lưu của mọi
    // người dùng đang bật đúng loại này (trước đây đến qua tự gán cho chủ hộp thư). Chủ hộp thư
    // tự mở hội thoại thì không báo.
    private function notifyInboxOwner(DomainEvent $event): void
    {
        [$conversation, $account] = $this->extractConversationAndAccount($event);
        $owner = $account->owner();

        if ($owner === null || $conversation->status === Conversation::STATUS_PENDING || $owner->is($event->data['performed_by'] ?? null)) {
            return;
        }

        $this->build('conversation_assignment', $owner, $account, $conversation);
    }

    private function build(string $notificationType, User $user, Account $account, Conversation $conversation): void
    {
        (new NotificationBuilder($notificationType, $user, $account, $conversation))->perform();
    }
}
