<?php

namespace App\Jobs;

use App\Mail\ConversationReplyMail;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Email\ChannelMailer;

/**
 * Port từ refs/chatwoot/app/jobs/conversation_reply_email_job.rb — thư tổng hợp
 * gửi cho khách sau khi agent trả lời. Tin đến gần nhất là email thì gửi bản
 * "không tóm tắt" (giữ đúng luồng thư), còn lại gửi bản có tóm tắt hội thoại.
 */
class ConversationReplyEmailJob extends ApplicationJob
{
    public function __construct(
        public readonly Conversation $conversation,
        public readonly int $lastQueuedId,
    ) {}

    public function handle(): void
    {
        if ($this->conversation->account->status !== Account::STATUS_ACTIVE) {
            return;
        }

        $lastIncoming = $this->conversation->messages()->incoming()->orderByDesc('id')->first();

        $mailable = $lastIncoming?->content_type === Message::CONTENT_TYPES['incoming_email']
            ? ConversationReplyMail::replyWithoutSummary($this->conversation, $this->lastQueuedId)
            : ConversationReplyMail::replyWithSummary($this->conversation, $this->lastQueuedId);

        if ($mailable === null) {
            return;
        }

        ChannelMailer::send($this->conversation->inbox, $mailable);
    }
}
