<?php

namespace App\Mailboxes;

use App\Finders\EmailChannelFinder;
use App\Services\Email\MailPresenter;
use App\Services\Mailbox\Strategies\ReceiverUuidStrategy;
use Illuminate\Support\Facades\Log;

/**
 * Port từ refs/chatwoot/app/mailboxes/application_mailbox.rb — cửa vào của mọi
 * thư đến: định tuyến sang ReplyMailbox khi thư thuộc một kênh đã xác minh
 * (hoặc mang địa chỉ `reply+<uuid>@`), còn lại rơi vào hộp mặc định (bỏ qua).
 */
class ApplicationMailbox
{
    public static function route(MailPresenter $mail): void
    {
        if (self::routesToReply($mail)) {
            (new ReplyMailbox)->process($mail);

            return;
        }

        (new DefaultMailbox)->process($mail);
    }

    public static function routesToReply(MailPresenter $mail): bool
    {
        return self::validToAddress($mail)
            && (self::replyUuidMail($mail) || (new EmailChannelFinder($mail))->perform() !== null);
    }

    public static function replyUuidMail(MailPresenter $mail): bool
    {
        foreach ($mail->to() as $email) {
            if (preg_match(ReceiverUuidStrategy::UUID_PATTERN, explode('@', $email)[0]) === 1) {
                return true;
            }
        }

        return false;
    }

    // `To` hỏng (không parse ra địa chỉ nào) thì bỏ thư — bản gốc kiểm bằng
    // kiểu Mail::AddressContainer, ở đây kiểm bằng kết quả parse.
    public static function validToAddress(MailPresenter $mail): bool
    {
        if ($mail->to() !== [] || blank($mail->mail()->getHeaderValue('To'))) {
            return true;
        }

        Log::error('Email to address header is malformed `'.$mail->mail()->getHeaderValue('To').'`');

        return false;
    }
}
