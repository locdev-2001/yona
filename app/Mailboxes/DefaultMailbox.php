<?php

namespace App\Mailboxes;

use App\Services\Email\MailPresenter;

// Port từ refs/chatwoot/app/mailboxes/default_mailbox.rb — hộp bắt-tất, không làm gì.
class DefaultMailbox
{
    public function process(MailPresenter $mail): void {}
}
