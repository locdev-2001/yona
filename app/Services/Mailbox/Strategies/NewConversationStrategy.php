<?php

namespace App\Services\Mailbox\Strategies;

use App\Finders\EmailChannelFinder;
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

/**
 * Chiến lược 4 (chốt chặn) — thư gửi thẳng vào địa chỉ inbox: dựng hội thoại mới
 * NHƯNG chưa lưu. ReplyMailbox lưu nó trong cùng transaction với message để job
 * chạy lại không đẻ ra hội thoại mồ côi.
 */
class NewConversationStrategy extends BaseStrategy
{
    use IncomingEmailValidity, MailboxHelper;

    private ?Email $channel;

    protected Account $account;

    protected Inbox $inbox;

    protected MailPresenter $processedMail;

    protected ?Contact $contact = null;

    protected ?ContactInbox $contactInbox = null;

    protected ?Conversation $conversation = null;

    protected ?Message $message = null;

    public function __construct(MailPresenter $mail)
    {
        parent::__construct($mail);

        $this->channel = (new EmailChannelFinder($mail))->perform();
        $this->processedMail = $mail;

        if ($this->channel !== null) {
            $this->account = $this->channel->account;
            $this->inbox = $this->channel->inbox;
        }
    }

    public function find(): ?Conversation
    {
        if ($this->channel === null || ! $this->incomingEmailFromValidEmail()) {
            return null;
        }

        return $this->findConversationByInReplyTo() ?? $this->buildConversation();
    }

    private function findConversationByInReplyTo(): ?Conversation
    {
        $inReplyTo = $this->inReplyTo();

        if (blank($inReplyTo)) {
            return null;
        }

        return $this->account->conversations()
            ->whereRaw("additional_attributes->>'in_reply_to' = ?", [$inReplyTo])
            ->first();
    }

    private function buildConversation(): Conversation
    {
        $this->findOrCreateContact();

        return new Conversation([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->contact->id,
            'contact_inbox_id' => $this->contactInbox->id,
            'additional_attributes' => [
                'in_reply_to' => $this->inReplyTo(),
                'source' => 'email',
                'auto_reply' => $this->processedMail->isAutoReply(),
                'mail_subject' => $this->sanitize($this->processedMail->subject()),
                'initiated_at' => ['timestamp' => now()->toIso8601ZuluString()],
            ],
        ]);
    }

    private function findOrCreateContact(): void
    {
        $this->contact = Contact::query()
            ->whereIn('id', $this->inbox->contactInboxes()->select('contact_id'))
            ->where('email', $this->originalSenderEmail())
            ->first();

        if ($this->contact === null) {
            // createContact() cần $this->conversation để lấy account_id ở
            // MailboxHelper::storeAttachmentPart — ở đây chỉ dùng nhánh contact.
            $this->createContact();

            return;
        }

        $this->contactInbox = ContactInbox::query()
            ->where('inbox_id', $this->inbox->id)
            ->where('contact_id', $this->contact->id)
            ->first();
    }

    private function originalSenderEmail(): ?string
    {
        $email = $this->sanitize($this->processedMail->originalSender());

        return $email === null ? null : strtolower((string) $email);
    }

    private function inReplyTo(): ?string
    {
        return $this->sanitize($this->processedMail->inReplyTo());
    }
}
