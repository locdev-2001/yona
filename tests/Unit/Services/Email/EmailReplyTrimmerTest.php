<?php

use App\Services\Email\EmailReplyTrimmer;

it('keeps multibyte characters whose utf-8 bytes contain 0x85 intact', function () {
    $trimmed = EmailReplyTrimmer::trim("Chào anh Nguyễn,\nHẹn gặp lại…");

    expect($trimmed)->toBe("Chào anh Nguyễn,\nHẹn gặp lại…")
        ->and(mb_check_encoding($trimmed, 'UTF-8'))->toBeTrue();
});

it('drops the quoted reply below the quote header', function () {
    expect(EmailReplyTrimmer::trim("Cảm ơn\nVào thứ Hai, Lan đã viết:\n> câu hỏi cũ"))->toBe('Cảm ơn');
});
