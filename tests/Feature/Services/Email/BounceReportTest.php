<?php

use App\Services\Email\Bounce\BounceReport;
use App\Services\Email\MailPresenter;

function bounceReportOf(string $fixture, array $replace = []): ?BounceReport
{
    return BounceReport::from(MailPresenter::fromRaw(strtr(file_get_contents(base_path("tests/Fixtures/emails/{$fixture}")), $replace)));
}

it('đọc thư gốc, người nhận lỗi và lời máy chủ từ DSN của Gmail', function () {
    $report = bounceReportOf('bounced_gmail_dsn.eml', ['{{ORIGINAL_MESSAGE_ID}}' => 'goc-1@mail.gmail.com']);

    expect($report->originalMessageIds())->toBe(['goc-1@mail.gmail.com'])
        ->and($report->failedRecipient())->toBe('khach.khong.co@gmail.com')
        ->and($report->diagnostic())->toBe('550 5.1.1 The email account that you tried to reach does not exist.');
});

it('thư thường không phải thư trả về', function () {
    expect(bounceReportOf('support.eml'))->toBeNull();
});
