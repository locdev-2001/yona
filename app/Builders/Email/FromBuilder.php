<?php

namespace App\Builders\Email;

// Chọn địa chỉ `From`
// theo cấu hình thật của kênh email (IMAP/SMTP/OAuth/chuyển tiếp).
class FromBuilder extends BaseBuilder
{
    public function build(): string
    {
        return $this->senderName($this->emailAddress());
    }

    // Địa chỉ trần ở ô "Từ" (không kèm tên) — nguồn duy nhất cho thư gửi khách và cho ví dụ ở trang cài đặt.
    public function emailAddress(): string
    {
        if (! $this->inbox->isEmail()) {
            return $this->accountSupportEmail();
        }

        $channel = $this->channel();

        return match ($this->emailChannelType()) {
            'google_oauth', 'microsoft_oauth', 'standard_imap_smtp', 'forwarding_own_smtp' => $channel->email,
            'imap_platform_smtp', 'forwarding_platform_smtp' => $channel->verified_for_sending
                ? $channel->email
                : $this->accountSupportEmail(),
            default => $this->accountSupportEmail(),
        };
    }

    private function emailChannelType(): string
    {
        $channel = $this->channel();

        return match (true) {
            $channel->isGoogle() => 'google_oauth',
            $channel->isMicrosoft() => 'microsoft_oauth',
            $channel->imap_enabled && $channel->smtp_enabled => 'standard_imap_smtp',
            $channel->imap_enabled && ! $channel->smtp_enabled => 'imap_platform_smtp',
            ! $channel->imap_enabled && $channel->smtp_enabled => 'forwarding_own_smtp',
            default => 'forwarding_platform_smtp',
        };
    }
}
