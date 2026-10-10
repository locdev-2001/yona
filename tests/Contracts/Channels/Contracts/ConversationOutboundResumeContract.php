<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Builders\ContactInboxBuilder;
use App\Builders\ConversationBuilder;
use App\Channels\Capability;
use App\Models\Conversation;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.5 conversation_outbound_resume — khai năng lực này thì khung soạn hội thoại mới hiện
 * hộp thư cho liên hệ đã từng nhắn ở đó, nên lõi phải mở được hội thoại MỚI trên địa chỉ
 * khách đã có (không mang thuộc tính nào của hội thoại cũ) và tin chữ đầu tiên đi tới đúng khách.
 */
final class ConversationOutboundResumeContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::ConversationOutboundResume;
    }

    public function assert(ChannelHarness $harness): void
    {
        $inbox = $harness->inbox();
        $lockedBefore = (bool) $inbox->lock_to_single_conversation;
        $inbox->update(['lock_to_single_conversation' => false]);

        $previous = $harness->receiveInbound(Capability::InboundText)->conversation;
        $previous->update(['status' => Conversation::STATUS_RESOLVED]);

        $contactInbox = (new ContactInboxBuilder(contact: $previous->contact, inbox: $inbox))->perform();

        expect($contactInbox?->id)->toBe($previous->contact_inbox_id, 'Mở lại hội thoại mà không dùng địa chỉ khách đã có ở hộp thư');

        $conversation = (new ConversationBuilder([], $contactInbox))->perform();

        expect($conversation->id)->not->toBe($previous->id, 'Người trực mở hội thoại mới mà lõi trả về hội thoại cũ');

        $message = $this->readyToSend($conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'chào lại anh chị',
        ]));
        $attempt = $harness->sendOutbound($message);

        expect($attempt->message->status)->not->toBe(Message::STATUSES['failed'], 'Tin đầu của hội thoại tự mở gửi lỗi')
            ->and($attempt->flattened())->toContain('chào lại anh chị')
            ->and($attempt->flattened())->toContain((string) $contactInbox->source_id);

        $inbox->update(['lock_to_single_conversation' => $lockedBefore]);
    }
}
