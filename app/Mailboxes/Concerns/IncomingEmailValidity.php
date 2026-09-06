<?php

namespace App\Mailboxes\Concerns;

use App\Models\Account;
use App\Support\EmailAddress;

// Port từ refs/chatwoot/app/mailboxes/incoming_email_validity_helper.rb —
// chặn các thư không được phép mở hội thoại: tài khoản ngưng hoạt động,
// thư thông báo do chính hệ thống gửi, thư trả về (bounce) không có người gửi hợp lệ.
trait IncomingEmailValidity
{
    protected function incomingEmailFromValidEmail(): bool
    {
        if (! $this->validExternalEmailForActiveAccount()) {
            return false;
        }

        return EmailAddress::isValid($this->processedMail->originalSender());
    }

    private function validExternalEmailForActiveAccount(): bool
    {
        return $this->account->status === Account::STATUS_ACTIVE && ! $this->processedMail->isNotificationEmailFromSelf();
    }
}
