<?php

namespace App\Builders\Email;

use App\Models\Account;
use App\Models\Inbox;
use App\Models\Message;
use App\Support\EmailAddress;
use Illuminate\Database\Eloquent\Model;

abstract class BaseBuilder
{
    public function __construct(
        protected readonly Inbox $inbox,
        protected readonly ?Message $message = null,
    ) {}

    abstract public function build(): string;

    protected function channel(): ?Model
    {
        return $this->inbox->channel;
    }

    protected function account(): Account
    {
        return $this->inbox->account;
    }

    protected function senderName(string $senderEmail): string
    {
        if ($this->inbox->sender_name_type !== Inbox::SENDER_NAME_TYPE_PROFESSIONAL) {
            return (new SenderNameBuilder(
                account: $this->account(),
                sender: $this->message?->sender,
                senderEmail: $senderEmail,
                senderName: $this->customSenderName(),
                businessName: $this->businessName(),
            ))->build();
        }

        return __('conversations.reply.email.header.professional_name', [
            'business_name' => (string) $this->businessName(),
            'from_email' => $senderEmail,
        ]);
    }

    protected function customSenderName(): string
    {
        return $this->message?->sender?->availableName()
            ?? __('conversations.reply.email.header.notifications');
    }

    protected function businessName(): ?string
    {
        return $this->inbox->sanitizedBusinessName();
    }

    // Người dùng có thể lưu support_email dạng "Tên <mail@x>" — chỉ lấy hộp thư.
    protected function accountSupportEmail(): string
    {
        return EmailAddress::parseOrDefault($this->account()->supportEmail());
    }
}
