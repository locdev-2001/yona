<?php

namespace App\Builders\Email;

// Port từ refs/chatwoot/app/builders/email/from_builder.rb — chọn địa chỉ `From`
// theo cấu hình thật của kênh email (IMAP/SMTP/OAuth/chuyển tiếp).
class FromBuilder extends BaseBuilder
{
    public function build(): string
    {
        if (! $this->inbox->isEmail()) {
            return $this->senderName($this->accountSupportEmail());
        }

        $channel = $this->channel();

        $fromEmail = match ($this->emailChannelType()) {
            'google_oauth', 'microsoft_oauth', 'standard_imap_smtp', 'forwarding_own_smtp' => $channel->email,
            'imap_chatwoot_smtp', 'forwarding_chatwoot_smtp' => $channel->verified_for_sending
                ? $channel->email
                : $this->accountSupportEmail(),
            default => $this->accountSupportEmail(),
        };

        return $this->senderName($fromEmail);
    }

    private function emailChannelType(): string
    {
        $channel = $this->channel();

        return match (true) {
            $channel->isGoogle() => 'google_oauth',
            $channel->isMicrosoft() => 'microsoft_oauth',
            $channel->imap_enabled && $channel->smtp_enabled => 'standard_imap_smtp',
            $channel->imap_enabled && ! $channel->smtp_enabled => 'imap_chatwoot_smtp',
            ! $channel->imap_enabled && $channel->smtp_enabled => 'forwarding_own_smtp',
            default => 'forwarding_chatwoot_smtp',
        };
    }
}
