<?php

namespace App\Listeners;

use App\Events\ConversationPhoneLearned;
use App\Models\Conversation;
use App\Services\ContactService;

/**
 * Quy tắc #1: gộp một người từ nhiều nguồn thành một hồ sơ khách — khóa chính
 * là số điện thoại.
 *
 * Sống ở tầng ứng dụng vì nó là chỗ DUY NHẤT được biết cả hai phía: hội thoại
 * bên chat và liên hệ bên CRM. Đặt nó vào trong module chat là bắt chat biết
 * tới CDP; đặt vào CRM là bắt CRM biết tới chat.
 */
class LinkContactFromConversationPhone
{
    public function __construct(private readonly ContactService $contacts) {}

    public function handle(ConversationPhoneLearned $event): void
    {
        $conversation = Conversation::find($event->conversationId);

        if ($conversation === null) {
            return;
        }

        $contact = $this->contacts->resolveOrCreateFromPeer(
            $conversation->workspace_id,
            $conversation->channel,
            $conversation->sender_uid,
            $event->phone,
            $conversation->thread_name,
        );

        if ($contact === null) {
            return;
        }

        if ($conversation->contact_id === null) {
            $conversation->forceFill(['contact_id' => $contact->id])->save();

            return;
        }

        // Hội thoại đã gắn một liên hệ KHÁC: đánh dấu cần người xem lại chứ
        // KHÔNG tự gộp — gộp nhầm hai khách hàng là thứ khó phát hiện và khó gỡ.
        if ($conversation->contact_id !== $contact->id) {
            $this->contacts->mergeIdentities($conversation->workspace_id, $conversation->contact_id, $contact->id);
        }
    }
}
