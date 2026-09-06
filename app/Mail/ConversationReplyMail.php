<?php

namespace App\Mail;

use App\Builders\Email\FromBuilder;
use App\Builders\Email\ReplyToBuilder;
use App\Builders\Email\SenderNameBuilder;
use App\Mail\Concerns\BuildsReferencesHeader;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Support\EmailAddress;
use Illuminate\Bus\Queueable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;
use RuntimeException;

/**
 * Port từ refs/chatwoot/app/mailers/conversation_reply_mailer.rb (+ helper của nó):
 * bốn kiểu thư trả lời của một hội thoại. Mỗi kiểu là một static factory trả về
 * null đúng chỗ bản gốc `return unless` — chỗ gọi không phải tự đoán điều kiện.
 */
class ConversationReplyMail extends Mailable
{
    use BuildsReferencesHeader, Queueable, SerializesModels;

    public const ACTION_REPLY_WITH_SUMMARY = 'reply_with_summary';

    public const ACTION_REPLY_WITHOUT_SUMMARY = 'reply_without_summary';

    public const ACTION_EMAIL_REPLY = 'email_reply';

    public const ACTION_TRANSCRIPT = 'conversation_transcript';

    private const VIEWS = [
        self::ACTION_REPLY_WITH_SUMMARY => 'mail.conversation-reply.reply-with-summary',
        self::ACTION_REPLY_WITHOUT_SUMMARY => 'mail.conversation-reply.reply-without-summary',
        self::ACTION_EMAIL_REPLY => 'mail.conversation-reply.email-reply',
        self::ACTION_TRANSCRIPT => 'mail.conversation-reply.conversation-transcript',
    ];

    // choose_layout: hai kiểu thư "trả lời thật" gửi trần, không bọc layout
    // thương hiệu — người nhận đang ở trong luồng thư của họ.
    private const LAYOUTLESS_ACTIONS = [self::ACTION_REPLY_WITHOUT_SUMMARY, self::ACTION_EMAIL_REPLY];

    /** @param Collection<int, Message>|null $messages */
    private function __construct(
        public readonly Conversation $conversation,
        public readonly string $action,
        public readonly ?Collection $messages = null,
        public readonly ?Message $message = null,
        private readonly ?string $transcriptToEmail = null,
    ) {}

    public static function replyWithSummary(Conversation $conversation, int $lastQueuedId): ?self
    {
        if (! self::smtpConfigSetOrDevelopment() || self::conversationAlreadyViewed($conversation)) {
            return null;
        }

        $recap = $conversation->messages()->chat()->where('id', '<', $lastQueuedId)
            ->orderByDesc('id')->limit(10)->get()->reverse();
        $new = $conversation->messages()->chat()->where('id', '>=', $lastQueuedId)->get();

        $messages = $recap->concat($new)->filter(fn (Message $m) => $m->isEmailReplySummarizable())->values();

        return new self($conversation, self::ACTION_REPLY_WITH_SUMMARY, new Collection($messages->all()));
    }

    public static function replyWithoutSummary(Conversation $conversation, int $lastQueuedId): ?self
    {
        if (! self::smtpConfigSetOrDevelopment() || self::conversationAlreadyViewed($conversation)) {
            return null;
        }

        $messages = $conversation->messages()
            ->whereIn('message_type', [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE])
            ->where('id', '>=', $lastQueuedId)
            ->get()
            ->reject(fn (Message $m) => $m->message_type === Message::TYPE_TEMPLATE && ! $m->isInputCsat())
            ->values();

        if ($messages->isEmpty()) {
            return null;
        }

        return new self($conversation, self::ACTION_REPLY_WITHOUT_SUMMARY, new Collection($messages->all()));
    }

    public static function emailReply(Message $message): ?self
    {
        $conversation = $message->conversation;
        $inbox = $conversation->inbox;
        $channel = $inbox->channel;

        $deliverable = self::smtpConfigSetOrDevelopment()
            || ($inbox->isEmail() && $channel->smtp_enabled)
            || ($inbox->isEmail() && $channel->imap_enabled && ($channel->isGoogle() || $channel->isMicrosoft()));

        if (! $deliverable) {
            return null;
        }

        return new self($conversation, self::ACTION_EMAIL_REPLY, message: $message);
    }

    public static function conversationTranscript(Conversation $conversation, string $toEmail): ?self
    {
        if (! self::smtpConfigSetOrDevelopment()) {
            return null;
        }

        $messages = $conversation->messages()->chat()->get()
            ->filter(fn (Message $m) => $m->isConversationTranscriptable())
            ->values();

        return new self(
            $conversation,
            self::ACTION_TRANSCRIPT,
            new Collection($messages->all()),
            transcriptToEmail: $toEmail,
        );
    }

    public function envelope(): Envelope
    {
        if ($this->action === self::ACTION_TRANSCRIPT) {
            return new Envelope(
                from: $this->address($this->fromEmailWithName()),
                to: [new Address((string) $this->transcriptToEmail)],
                subject: "[#{$this->conversation->display_id}] ".__('conversations.reply.transcript_subject'),
            );
        }

        // cc/bcc chỉ đi kèm hai kiểu thư có ngữ cảnh người nhận thật.
        $ccBccEnabled = $this->action !== self::ACTION_REPLY_WITHOUT_SUMMARY;

        return new Envelope(
            from: $this->address($this->emailFrom()),
            to: array_map(fn (string $email) => new Address($email), $this->toEmails()),
            cc: $ccBccEnabled ? $this->contentAttributeEmails('cc_emails') : [],
            bcc: $ccBccEnabled ? $this->contentAttributeEmails('bcc_emails') : [],
            replyTo: [$this->address($this->emailReplyTo())],
            subject: $this->mailSubject(),
        );
    }

    public function content(): Content
    {
        return new Content(view: self::VIEWS[$this->action], with: [
            'conversation' => $this->conversation,
            'account' => $this->conversation->account,
            'contact' => $this->conversation->contact,
            'inbox' => $this->conversation->inbox,
            'messages' => $this->messages ?? new Collection,
            'emailMessage' => $this->message,
            'largeAttachments' => $this->largeAttachments(),
            'withLayout' => ! in_array($this->action, self::LAYOUTLESS_ACTIONS, true),
        ]);
    }

    public function headers(): Headers
    {
        $inReplyTo = $this->inReplyToEmail();
        $references = $this->buildReferencesHeader($this->conversation, $inReplyTo);

        return new Headers(
            messageId: $this->customMessageId(),
            references: $references,
            text: filled($inReplyTo) ? ['In-Reply-To' => $inReplyTo] : [],
        );
    }

    // process_attachments_as_files_for_email_reply: tệp nhỏ đính kèm thẳng vào
    // thư, tệp lớn chỉ để link trong thân thư.
    public function attachments(): array
    {
        return $this->smallAttachments()
            ->map(fn (Attachment $attachment) => \Illuminate\Mail\Mailables\Attachment::fromStorageDisk(
                $attachment->disk,
                (string) $attachment->path
            )->as((string) $attachment->filename)->withMime((string) $attachment->content_type))
            ->all();
    }

    /** @return \Illuminate\Support\Collection<int, Attachment> */
    public function largeAttachments(): \Illuminate\Support\Collection
    {
        return $this->messageAttachments()->filter(fn (Attachment $a) => $a->byte_size > self::MAX_INLINE_ATTACHMENT_BYTES);
    }

    public const MAX_INLINE_ATTACHMENT_BYTES = 5 * 1024 * 1024;

    /** @return \Illuminate\Support\Collection<int, Attachment> */
    private function smallAttachments(): \Illuminate\Support\Collection
    {
        return $this->messageAttachments()->filter(fn (Attachment $a) => $a->byte_size <= self::MAX_INLINE_ATTACHMENT_BYTES);
    }

    /** @return \Illuminate\Support\Collection<int, Attachment> */
    private function messageAttachments(): \Illuminate\Support\Collection
    {
        if ($this->action !== self::ACTION_EMAIL_REPLY || $this->message === null) {
            return collect();
        }

        return $this->message->attachments->filter(fn (Attachment $a) => $a->hasFile());
    }

    // ---- Người gửi / người nhận -------------------------------------------------

    private function emailFrom(): string
    {
        if ($this->account()->featureEnabled('reply_mailer_migration')) {
            return (new FromBuilder($this->inbox(), $this->currentMessage()))->build();
        }

        return $this->emailOauthEnabled() || $this->emailSmtpEnabled()
            ? $this->senderName($this->inbox()->channel->email)
            : $this->fromEmailWithName();
    }

    private function emailReplyTo(): string
    {
        if ($this->account()->featureEnabled('reply_mailer_migration')) {
            return (new ReplyToBuilder($this->inbox(), $this->currentMessage()))->build();
        }

        return $this->emailImapEnabled() ? $this->inbox()->channel->email : $this->replyEmail();
    }

    private function fromEmailWithName(): string
    {
        return $this->senderName($this->fromEmail());
    }

    private function fromEmail(): string
    {
        return $this->shouldUseConversationEmailAddress()
            ? EmailAddress::parseOrDefault($this->account()->supportEmail())
            : EmailAddress::parseOrDefault($this->inboxFromEmailAddress());
    }

    private function replyEmail(): string
    {
        if ($this->shouldUseConversationEmailAddress()) {
            return $this->senderName('reply+'.$this->conversation->uuid.'@'.$this->account()->inboundEmailDomain());
        }

        return (string) ($this->inbox()->email_address ?? $this->conversation->assignee?->email);
    }

    private function inboxFromEmailAddress(): ?string
    {
        return $this->inbox()->email_address ?? $this->account()->supportEmail();
    }

    private function senderName(string $senderEmail): string
    {
        if ($this->inbox()->sender_name_type === Inbox::SENDER_NAME_TYPE_PROFESSIONAL) {
            return __('conversations.reply.email.header.professional_name', [
                'business_name' => $this->inbox()->sanitizedBusinessName(),
                'from_email' => $senderEmail,
            ]);
        }

        return (new SenderNameBuilder(
            account: $this->account(),
            sender: $this->currentMessage()?->sender,
            senderEmail: $senderEmail,
            senderName: $this->customSenderName(),
            businessName: $this->inbox()->sanitizedBusinessName(),
        ))->build();
    }

    private function customSenderName(): string
    {
        return $this->currentMessage()?->sender?->availableName()
            ?? $this->conversation->assignee?->availableName()
            ?? __('conversations.reply.email.header.notifications');
    }

    /** @return list<string> */
    private function toEmails(): array
    {
        $fromAttributes = $this->contentAttributeList('to_emails');

        return $fromAttributes !== []
            ? $fromAttributes
            : array_values(array_filter([$this->conversation->contact?->email]));
    }

    /** @return list<Address> */
    private function contentAttributeEmails(string $key): array
    {
        return array_map(fn (string $email) => new Address($email), $this->contentAttributeList($key));
    }

    /** @return list<string> */
    private function contentAttributeList(string $key): array
    {
        return array_values(array_filter((array) data_get($this->currentMessage()?->content_attributes, $key)));
    }

    // ---- Chủ đề + header nối luồng ---------------------------------------------

    private function mailSubject(): string
    {
        $subject = $this->conversation->additional_attributes['mail_subject'] ?? null;

        if ($subject === null) {
            return "[#{$this->conversation->display_id}] ".__('conversations.reply.email_subject');
        }

        return $this->conversation->messages()->chat()->count() > 1 ? "Re: {$subject}" : (string) $subject;
    }

    private function customMessageId(): string
    {
        $lastMessage = $this->message ?? $this->messages?->last();

        return 'conversation/'.$this->conversation->uuid.'/messages/'.$lastMessage?->id.'@'.$this->channelEmailDomain();
    }

    private function inReplyToEmail(): string
    {
        $messageId = data_get(
            $this->conversation->messages()->incoming()->orderByDesc('id')->first()?->content_attributes,
            'email.message_id'
        );

        return filled($messageId)
            ? "<{$messageId}>"
            : '<account/'.$this->account()->id.'/conversation/'.$this->conversation->uuid.'@'.$this->channelEmailDomain().'>';
    }

    private function channelEmailDomain(): string
    {
        if (filled($this->account()->inboundEmailDomain())) {
            return (string) $this->account()->inboundEmailDomain();
        }

        $email = $this->inbox()->channel?->getAttribute('email');

        if (blank($email)) {
            throw new RuntimeException('Channel email domain not present.');
        }

        return explode('@', (string) $email)[1];
    }

    // ---- Điều kiện gửi ----------------------------------------------------------

    private function shouldUseConversationEmailAddress(): bool
    {
        return $this->inbox()->isEmail() || $this->inboundEmailEnabled();
    }

    private function inboundEmailEnabled(): bool
    {
        return $this->account()->featureEnabled('inbound_emails')
            && filled($this->account()->inboundEmailDomain())
            && filled($this->account()->supportEmail());
    }

    private function emailSmtpEnabled(): bool
    {
        return $this->inbox()->isEmail() && $this->inbox()->channel->smtp_enabled;
    }

    private function emailImapEnabled(): bool
    {
        return $this->inbox()->isEmail() && $this->inbox()->channel->imap_enabled;
    }

    private function emailOauthEnabled(): bool
    {
        return $this->inbox()->isEmail()
            && ($this->inbox()->channel->isMicrosoft() || $this->inbox()->channel->isGoogle());
    }

    public static function smtpConfigSetOrDevelopment(): bool
    {
        return filled(config('mail.smtp_address')) || app()->environment('local');
    }

    // Khách đã đọc tin trên widget rồi thì đừng gửi thư nhắc lại.
    private static function conversationAlreadyViewed(Conversation $conversation): bool
    {
        $lastSeen = $conversation->contact_last_seen_at;
        $lastOutgoing = $conversation->messages()->chat()
            ->where('message_type', '!=', Message::TYPE_INCOMING)
            ->orderByDesc('id')->first();

        return $lastSeen !== null && $lastOutgoing !== null && $lastSeen->greaterThan($lastOutgoing->created_at);
    }

    private function currentMessage(): ?Message
    {
        return $this->message ?? $this->conversation->messages()->outgoing()->orderByDesc('id')->first();
    }

    private function account(): Account
    {
        return $this->conversation->account;
    }

    private function inbox(): Inbox
    {
        return $this->conversation->inbox;
    }

    private function address(string $formatted): Address
    {
        return new Address(
            (string) EmailAddress::parse($formatted),
            EmailAddress::displayName($formatted)
        );
    }
}
