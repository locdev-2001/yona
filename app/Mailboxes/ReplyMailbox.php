<?php

namespace App\Mailboxes;

use App\Mailboxes\Concerns\MailboxHelper;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Email\MailPresenter;
use App\Services\Mailbox\ConversationFinder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Hộp thư hợp nhất: một
 * ConversationFinder quyết định thư nối vào hội thoại nào (hoặc mở hội thoại mới),
 * rồi cả hội thoại + message + tệp đính kèm được lưu trong MỘT transaction.
 */
class ReplyMailbox
{
    use MailboxHelper;

    protected Conversation $conversation;

    protected MailPresenter $processedMail;

    protected ?Message $message = null;

    public function process(MailPresenter $mail): void
    {
        $conversation = (new ConversationFinder($mail))->find();

        if ($conversation === null) {
            Log::info('Email '.$mail->messageId().' rejected - no conversation found');

            return;
        }

        $this->conversation = $conversation;
        $this->processedMail = new MailPresenter($mail->mail(), $conversation->account);

        DB::transaction(function () {
            if (! $this->conversation->exists) {
                $this->conversation->save();
            }

            $this->createMessage();
            $this->addAttachmentsToMessage();
        });
    }
}
