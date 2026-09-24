<?php

namespace App\Mailboxes;

use App\Mailboxes\Concerns\IncomingEmailValidity;
use App\Mailboxes\Concerns\MailboxHelper;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Email\MailPresenter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Thư lấy về qua IMAP
 * của một kênh cụ thể, nên kênh biết trước; chỉ còn việc nối thư vào đúng hội thoại.
 */
class ImapMailbox
{
    use IncomingEmailValidity, MailboxHelper;

    private const FALLBACK_CONVERSATION_PATTERN = '#account/(\d+)/conversation/([a-zA-Z0-9-]+)@#';

    protected Account $account;

    protected Inbox $inbox;

    protected Conversation $conversation;

    protected MailPresenter $processedMail;

    protected ?Contact $contact = null;

    protected ?ContactInbox $contactInbox = null;

    protected ?Message $message = null;

    public function process(MailPresenter $mail, Email $channel): void
    {
        $this->processedMail = $mail;
        $this->account = $channel->account;
        $this->inbox = $channel->inbox;

        Log::info('[IMAP] Processing email from '.$mail->originalSender().' : inbox '.$this->inbox->id
            .' : message_id '.$mail->messageId());

        if (! $this->incomingEmailFromValidEmail()) {
            return;
        }

        DB::transaction(function () {
            $this->findOrCreateContact();
            $this->findOrCreateConversation();
            $this->createMessage();
            $this->addAttachmentsToMessage();
        });
    }

    private function findOrCreateContact(): void
    {
        $this->contact = Contact::query()
            ->whereIn('id', $this->inbox->contactInboxes()->select('contact_id'))
            ->where('email', $this->originalSenderEmail())
            ->first();

        if ($this->contact === null) {
            $this->createContact();

            return;
        }

        $this->contactInbox = ContactInbox::query()
            ->where('inbox_id', $this->inbox->id)
            ->where('contact_id', $this->contact->id)
            ->first();
    }

    private function findOrCreateConversation(): void
    {
        $this->conversation = $this->findConversationByInReplyTo()
            ?? $this->findConversationByReferenceIds()
            ?? Conversation::create([
                'account_id' => $this->account->id,
                'inbox_id' => $this->inbox->id,
                'contact_id' => $this->contact->id,
                'contact_inbox_id' => $this->contactInbox->id,
                'additional_attributes' => [
                    'source' => 'email',
                    'in_reply_to' => $this->inReplyTo(),
                    'auto_reply' => $this->processedMail->isAutoReply(),
                    'mail_subject' => $this->sanitize($this->processedMail->subject()),
                    'initiated_at' => ['timestamp' => now()->utc()->toDateTimeString()],
                ],
            ]);
    }

    private function findConversationByInReplyTo(): ?Conversation
    {
        $inReplyTo = $this->inReplyTo();

        if (blank($inReplyTo)) {
            return null;
        }

        $message = $this->inbox->messages()->where('source_id', $inReplyTo)->first();

        if ($message === null) {
            return $this->inbox->conversations()
                ->whereRaw("additional_attributes->>'in_reply_to' = ?", [$inReplyTo])
                ->first();
        }

        return $this->inbox->conversations()->whereKey($message->conversation_id)->first();
    }

    private function findConversationByReferenceIds(): ?Conversation
    {
        $references = $this->references();

        if ($references === []) {
            return null;
        }

        $message = $this->inbox->messages()->whereIn('source_id', $references)->latest('id')->first();

        if ($message !== null) {
            $conversation = $this->inbox->conversations()->whereKey($message->conversation_id)->first();

            if ($conversation !== null) {
                return $conversation;
            }
        }

        // FALLBACK: hội thoại do agent mở trước (chưa có tin đến nào) chỉ nhận
        // ra được qua uuid nhét trong Message-ID.
        foreach ($references as $reference) {
            if (preg_match(self::FALLBACK_CONVERSATION_PATTERN, $reference, $matches) === 1) {
                return $this->inbox->conversations()->where('uuid', $matches[2])->first();
            }
        }

        return null;
    }

    private function inReplyTo(): ?string
    {
        return $this->sanitize($this->processedMail->inReplyTo());
    }

    /** @return list<string> */
    private function references(): array
    {
        return $this->sanitize($this->processedMail->references());
    }

    private function originalSenderEmail(): ?string
    {
        $email = $this->sanitize($this->processedMail->originalSender());

        return $email === null ? null : strtolower((string) $email);
    }
}
