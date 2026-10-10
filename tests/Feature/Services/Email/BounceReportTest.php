<?php

use App\Services\Email\Bounce\BounceReport;
use App\Services\Email\MailPresenter;

function bounceReportOf(string $fixture, array $replace = []): ?BounceReport
{
    return BounceReport::from(MailPresenter::fromRaw(strtr(file_get_contents(base_path("tests/Fixtures/emails/{$fixture}")), $replace)));
}

function forgedBounceMail(string $headers): string
{
    return <<<EML
    From: Ke Gia Mao <attacker@example.net>
    To: care@example.com
    Subject: Delivery Status Notification (Failure)
    Message-ID: <forged-1@example.net>
    In-Reply-To: <goc-1@mail.gmail.com>
    {$headers}
    Content-Type: multipart/report; boundary="b"; report-type=delivery-status

    --b
    Content-Type: message/delivery-status

    Reporting-MTA: dns; example.net

    Final-Recipient: rfc822; khach.khong.co@gmail.com
    Action: failed
    Status: 5.1.1

    --b
    Content-Type: text/rfc822-headers

    Message-ID: <goc-1@mail.gmail.com>

    --b--
    EML;
}

it('đọc thư gốc, người nhận lỗi và lời máy chủ từ DSN của Gmail', function () {
    $report = bounceReportOf('bounced_gmail_dsn.eml', ['{{ORIGINAL_MESSAGE_ID}}' => 'goc-1@mail.gmail.com']);

    expect($report->originalMessageIds())->toBe(['goc-1@mail.gmail.com'])
        ->and($report->failedRecipients())->toBe(['khach.khong.co@gmail.com'])
        ->and($report->diagnosticFor('KHACH.khong.co@gmail.com'))->toBe('550 5.1.1 The email account that you tried to reach does not exist.');
});

it('thư báo trì hoãn của Gmail không phải thư trả về', function () {
    expect(bounceReportOf('delayed_gmail_dsn.eml', ['{{ORIGINAL_MESSAGE_ID}}' => 'goc-1@mail.gmail.com']))->toBeNull();
});

it('thư thường không phải thư trả về', function () {
    expect(bounceReportOf('support.eml'))->toBeNull();
});

it('thư tự xưng thư trả về nhưng người gửi không phải hệ thống thư thì không tin', function () {
    expect(BounceReport::from(MailPresenter::fromRaw(forgedBounceMail('X-Failed-Recipients: khach.khong.co@gmail.com'))))->toBeNull();
});

it('nhận thư trả về khi người gửi phong bì rỗng dù From không phải MAILER-DAEMON', function () {
    expect(BounceReport::from(MailPresenter::fromRaw(forgedBounceMail('Return-Path: <>')))?->failedRecipients())
        ->toBe(['khach.khong.co@gmail.com']);
});

it('thiếu Action thì dựa vào mã Status 5.x.x', function (string $status, bool $bounced) {
    $raw = str_replace("Action: failed\n", '', forgedBounceMail('Return-Path: <>'));
    $raw = str_replace('Status: 5.1.1', "Status: {$status}", $raw);

    expect(BounceReport::from(MailPresenter::fromRaw($raw)) !== null)->toBe($bounced);
})->with([
    'lỗi vĩnh viễn' => ['5.1.1', true],
    'lỗi tạm thời' => ['4.4.1', false],
]);
