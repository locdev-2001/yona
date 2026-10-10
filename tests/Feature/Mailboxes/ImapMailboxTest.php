<?php

use App\Mailboxes\ImapMailbox;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Email\MailPresenter;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Port từ spec/mailboxes/imap/imap_mailbox_spec.rb — kênh đã biết trước, chỉ còn
// việc nối thư vào hội thoại.

beforeEach(function () {
    Storage::fake('public');
    $this->account = Account::factory()->create();
    $this->channel = Email::factory()->create(['account_id' => $this->account->id, 'email' => 'care@example.com']);
    $this->inbox = Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_id' => $this->channel->id,
        'channel_type' => 'Channel::Email',
    ]);
});

function processImap(Email $channel, string $fixture): void
{
    (new ImapMailbox)->process(
        MailPresenter::fromRaw(file_get_contents(base_path("tests/Fixtures/emails/{$fixture}")), $channel->account),
        $channel
    );
}

it('creates contact, conversation and message from a fetched mail', function () {
    processImap($this->channel, 'support.eml');

    $conversation = Conversation::query()->where('inbox_id', $this->inbox->id)->first();

    expect($conversation)->not->toBeNull()
        ->and($conversation->additional_attributes['source'])->toBe('email')
        ->and($conversation->additional_attributes['auto_reply'])->toBeFalse()
        ->and($conversation->contact->email)->toBe('sony@example.com')
        ->and($conversation->messages()->count())->toBe(1)
        ->and($conversation->messages()->first()->content_type)->toBe(Message::CONTENT_TYPES['incoming_email']);
});

it('threads a second mail into the same conversation through in reply to', function () {
    processImap($this->channel, 'support.eml');
    $conversation = Conversation::query()->where('inbox_id', $this->inbox->id)->first();

    processImap($this->channel, 'in_reply_to.eml');

    expect(Conversation::query()->where('inbox_id', $this->inbox->id)->count())->toBe(1)
        ->and($conversation->messages()->count())->toBe(2);
});

it('skips a mail whose sender is not a valid email', function () {
    processImap($this->channel, 'bounced_with_no_from.eml');

    expect(Conversation::query()->where('inbox_id', $this->inbox->id)->count())->toBe(0);
});

it('skips every mail once the account is suspended', function () {
    $this->account->update(['status' => Account::STATUS_SUSPENDED]);

    processImap($this->channel->fresh(), 'support.eml');

    expect(Conversation::query()->where('inbox_id', $this->inbox->id)->count())->toBe(0);
});

it('marks auto replies on the conversation', function () {
    processImap($this->channel, 'auto_reply.eml');

    $conversation = Conversation::query()->where('inbox_id', $this->inbox->id)->first();

    expect($conversation?->additional_attributes['auto_reply'])->toBeTrue();
});

it('keeps the message of a mail that only has an html body', function () {
    processImap($this->channel, 'only_html.eml');

    $message = Conversation::query()->where('inbox_id', $this->inbox->id)->first()?->messages()->first();

    expect($message?->content)->toContain('This is html only mail');
});

function bouncedOutgoingMessage($test, ?string $sourceId): Message
{
    // Không để lõi tự gửi tin ra SMTP rồi ghi đè source_id.
    Queue::fake();
    $conversation = Conversation::factory()->create([
        'account_id' => $test->account->id,
        'inbox_id' => $test->inbox->id,
        'contact_id' => Contact::factory()->create(['account_id' => $test->account->id, 'email' => 'khach.khong.co@gmail.com'])->id,
    ]);

    return Message::query()->create([
        'account_id' => $test->account->id,
        'inbox_id' => $test->inbox->id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Gửi anh chị báo giá',
        'source_id' => $sourceId,
    ]);
}

function processBounce(Email $channel, string $originalMessageId): void
{
    $raw = str_replace('{{ORIGINAL_MESSAGE_ID}}', $originalMessageId, file_get_contents(base_path('tests/Fixtures/emails/bounced_gmail_dsn.eml')));

    (new ImapMailbox)->process(MailPresenter::fromRaw($raw, $channel->account), $channel);
}

it('thư trả về đánh dấu tin đi gốc gửi lỗi kèm lời máy chủ, không mở hội thoại', function () {
    $message = bouncedOutgoingMessage($this, 'goc-123@mail.gmail.com');
    $conversationsBefore = Conversation::query()->count();

    processBounce($this->channel, 'goc-123@mail.gmail.com');

    $message->refresh();

    expect($message->status)->toBe(Message::STATUSES['failed'])
        ->and($message->content_attributes['external_error'])->toBe([
            'code' => 'email_bounced',
            'message' => __('errors.messages.email_bounced', [
                'email' => 'khach.khong.co@gmail.com',
                'reason' => '550 5.1.1 The email account that you tried to reach does not exist.',
            ]),
        ])
        ->and(Conversation::query()->count())->toBe($conversationsBefore)
        ->and(Message::query()->where('message_type', Message::TYPE_INCOMING)->count())->toBe(0);
});

it('thư trả về nhận ra tin gốc qua Message-ID Yona tự đặt khi tin chưa lưu source_id', function () {
    $message = bouncedOutgoingMessage($this, null);

    processBounce($this->channel, "conversation/{$message->conversation->uuid}/messages/{$message->id}@example.com");

    expect($message->fresh()->status)->toBe(Message::STATUSES['failed']);
});

it('thư trả về không khớp tin nào thì bỏ qua êm', function () {
    $message = bouncedOutgoingMessage($this, 'tin-khac@mail.gmail.com');

    processBounce($this->channel, 'khong-co@mail.gmail.com');

    expect($message->fresh()->status)->toBe(Message::STATUSES['sent'])
        ->and(Conversation::query()->count())->toBe(1);
});

it('thư trả về của Gmail không kèm Diagnostic-Code vẫn lấy được lời máy chủ trong thân thư', function () {
    $message = bouncedOutgoingMessage($this, 'conversation/93775311-9416-4428-964b-862001f8a8b2/messages/27855337@gmail.com');

    processImap($this->channel, 'bounced_gmail.eml');

    expect($message->fresh()->content_attributes['external_error']['message'])->toBe(__('errors.messages.email_bounced', [
        'email' => 'alex.jones@fictionalcorp.com',
        'reason' => '550 5.1.1 The email account that you tried to reach does not exist.',
    ]));
});
