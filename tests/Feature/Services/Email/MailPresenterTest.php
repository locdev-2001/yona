<?php

use App\Services\Email\MailPresenter;

// Dùng các fixture .eml trong tests/Fixtures/emails.

function fixtureMail(string $name): MailPresenter
{
    return MailPresenter::fromRaw(file_get_contents(base_path("tests/Fixtures/emails/{$name}")));
}

it('parses subject, sender and message id', function () {
    $mail = fixtureMail('reply.eml');

    expect($mail->subject())->toBe("Discussion: Let's debate these attachments")
        ->and($mail->messageId())->toBe('0CB459E0-0336-41DA-BC88-E6E28C697DDB@example.com')
        ->and($mail->from())->toBe(['sony@example.com'])
        ->and($mail->originalSender())->toBe('sony@example.com')
        ->and($mail->senderName())->toBe('Sony Mathew')
        ->and($mail->to())->toBe(['reply+6bdc3f4d-0bec-4515-a284-5d916fdde489@example.com']);
});

it('keeps only the first in reply to value', function () {
    expect(fixtureMail('reply.eml')->inReplyTo())->toBe('4e6e35f5a38b4_479f13bb90078178@small-app-01.mail');
});

it('splits the references header', function () {
    expect(fixtureMail('mail_with_references.eml')->references())->not->toBeEmpty();
});

it('serializes every key the message content attributes expect', function () {
    expect(array_keys(fixtureMail('reply.eml')->serializedData()))->toBe([
        'bcc', 'cc', 'content_type', 'date', 'from', 'headers', 'html_content', 'in_reply_to',
        'message_id', 'multipart', 'number_of_attachments', 'references', 'subject', 'text_content',
        'to', 'auto_reply',
    ]);
});

it('exposes attachments of the mail', function () {
    expect(fixtureMail('reply.eml')->numberOfAttachments())->toBe(2);
});

it('reads the text body and trims the quoted part', function () {
    $content = fixtureMail('mail_with_quote.eml')->textContent();

    expect($content['reply'])->toContain('Yes, I am providing you step how to reproduce this issue')
        ->and($content['reply'])->toContain('Any update on this?')
        ->and($content['quoted'])->toContain('Yes, I am providing you step how to reproduce this issue')
        ->and($content['quoted'])->not->toContain('Any update on this?');
});

it('detects auto replies from both headers', function () {
    expect(fixtureMail('auto_reply.eml')->isAutoReply())->toBeTrue()
        ->and(fixtureMail('auto_reply_with_auto_submitted.eml')->isAutoReply())->toBeTrue()
        ->and(fixtureMail('reply.eml')->isAutoReply())->toBeFalse();
});

it('recognises notification emails sent by the installation itself', function () {
    config(['mail.sender_email' => 'sony@example.com']);

    expect(fixtureMail('reply.eml')->isNotificationEmailFromSelf())->toBeTrue();

    config(['mail.sender_email' => 'accounts@yona.vn']);

    expect(fixtureMail('reply.eml')->isNotificationEmailFromSelf())->toBeFalse();
});

it('falls back to the forwarded for header when there is no to address', function () {
    $mail = fixtureMail('forwarder_email.eml');

    expect($mail->mailReceiver())->not->toBeEmpty();
});
