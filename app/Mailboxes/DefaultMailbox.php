<?php

namespace App\Mailboxes;

use App\Services\Email\MailPresenter;

// Hộp bắt-tất, không làm gì.
class DefaultMailbox
{
    public function process(MailPresenter $mail): void {}
}
