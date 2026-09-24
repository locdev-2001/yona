<?php

namespace App\Finders;

use App\Models\Channel\Email;
use App\Services\Email\MailPresenter;
use App\Support\EmailAddress;

// Tìm kênh email
// nhận thư này theo địa chỉ inbox (`email`) hoặc địa chỉ chuyển tiếp (`forward_to_email`).
class EmailChannelFinder
{
    public function __construct(private readonly MailPresenter $mail) {}

    public function perform(): ?Email
    {
        return $this->channelFromRecipients($this->primaryRecipientEmails())
            ?? $this->channelFromBccRecipients();
    }

    // GlobalConfigService SKIP_INCOMING_BCC_PROCESSING: một số tài khoản không
    // muốn thư chỉ-BCC mở hội thoại (thư gửi hàng loạt lọt vào inbox).
    private function channelFromBccRecipients(): ?Email
    {
        $skippedAccountIds = collect(explode(',', (string) config('mail.skip_incoming_bcc_processing')))
            ->map(fn (string $id) => (int) trim($id))
            ->filter()
            ->all();

        foreach ($this->mail->bcc() as $email) {
            $channel = $this->channelFromEmail($email);

            if ($channel !== null && ! in_array($channel->account_id, $skippedAccountIds, true)) {
                return $channel;
            }
        }

        return null;
    }

    /** @param list<string> $emails */
    private function channelFromRecipients(array $emails): ?Email
    {
        foreach ($emails as $email) {
            $channel = $this->channelFromEmail($email);

            if ($channel !== null) {
                return $channel;
            }
        }

        return null;
    }

    /** @return list<string> */
    private function primaryRecipientEmails(): array
    {
        $originalTo = EmailAddress::parse($this->mail->mail()->getHeaderValue('X-Original-To'));

        return array_values(array_filter([
            ...$this->mail->to(),
            ...$this->mail->cc(),
            $originalTo,
        ]));
    }

    private function channelFromEmail(string $email): ?Email
    {
        $normalized = EmailAddress::normalizeWithPlusAddressing($email);

        return Email::query()
            ->whereRaw('lower(email) = ? OR lower(forward_to_email) = ?', [$normalized, $normalized])
            ->first();
    }
}
