<?php

use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Slack\SendOnSlackService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

// Port từ spec/lib/integrations/slack/send_on_slack_service_spec.rb.

beforeEach(function () {
    $this->contact = Contact::factory()->create();
    $this->inbox = Inbox::factory()->email()->create(['account_id' => $this->contact->account_id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->contact->account_id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->contact->id,
        'identifier' => null,
    ]);
    $this->hook = Hook::factory()->create(['account_id' => $this->contact->account_id, 'reference_id' => 'C123']);
});

function slackPostMessageStub(string $ts = '12345.6789', ?string $threadTs = '12345.6789', ?string $messageTs = '6789.12345'): void
{
    Http::fake([
        'https://slack.com/api/chat.postMessage' => Http::response([
            'ok' => true,
            'ts' => $ts,
            'message' => ['ts' => $messageTs, 'thread_ts' => $threadTs],
        ]),
    ]);
}

it('gửi tin lần đầu (chưa có identifier) kèm tên inbox + link hội thoại, và lưu ts vào identifier', function () {
    slackPostMessageStub();

    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'content' => 'Xin chào',
    ]);
    $message->sender()->associate($this->contact);
    $message->save();

    (new SendOnSlackService($message, $this->hook))->perform();

    expect($this->conversation->refresh()->identifier)->toBe('12345.6789');

    Http::assertSent(function ($request) {
        $expectedText = "\n*Inbox:* {$this->inbox->name} ({$this->inbox->inboxType()})\n"
            .'<'.rtrim(config('app.url'), '/')."/app/accounts/{$this->conversation->account_id}/conversations/{$this->conversation->display_id}|Click here> to view the conversation.\n"
            ."\nXin chào";

        return $request->url() === 'https://slack.com/api/chat.postMessage'
            && $request['channel'] === 'C123'
            && $request['text'] === $expectedText
            && $request['username'] === "{$this->contact->name} (Contact)"
            && $request['unfurl_links'] === 'false';
    });
});

it('khi hội thoại đã có identifier, gửi thẳng nội dung vào luồng cũ và lưu external_source_id_slack', function () {
    $this->conversation->update(['identifier' => 'random_slack_thread_ts']);
    slackPostMessageStub();

    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'content' => 'Nội dung tin',
    ]);
    $message->sender()->associate($this->contact);
    $message->save();

    (new SendOnSlackService($message, $this->hook))->perform();

    expect($message->refresh()->external_source_ids['slack'] ?? null)->toBe('cw-origin-6789.12345');

    Http::assertSent(fn ($request) => $request['text'] === 'Nội dung tin'
        && $request['thread_ts'] === 'random_slack_thread_ts'
        && $request['unfurl_links'] === 'true');
});

it('mở luồng mới khi hook đã đổi sang kênh khác (thread_ts rỗng trong echo)', function () {
    $this->conversation->update(['identifier' => 'random_slack_thread_ts']);
    $this->hook->update(['reference_id' => 'C999']);
    slackPostMessageStub(ts: '1691652432.896169', threadTs: null, messageTs: '1691652432.896169');

    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
    ]);
    $message->sender()->associate($this->contact);
    $message->save();

    (new SendOnSlackService($message, $this->hook))->perform();

    expect($this->conversation->refresh()->identifier)->toBe('1691652432.896169');
});

it('không gửi khi tin đã có external_source_id_slack (chặn vòng lặp)', function () {
    Http::fake();

    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'external_source_ids' => ['slack' => 'cw-origin-already'],
    ]);

    (new SendOnSlackService($message, $this->hook))->perform();

    Http::assertNothingSent();
});

it('không gửi tin outgoing/template khi hội thoại chưa có identifier (chưa từng nối Slack)', function () {
    Http::fake();

    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
    ]);

    (new SendOnSlackService($message, $this->hook))->perform();

    Http::assertNothingSent();
});

it('vô hiệu hoá hook khi Slack trả lỗi account_inactive', function () {
    $this->conversation->update(['identifier' => 'random_slack_thread_ts']);
    Http::fake(['https://slack.com/api/chat.postMessage' => Http::response(['ok' => false, 'error' => 'account_inactive'])]);

    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
    ]);
    $message->sender()->associate($this->contact);
    $message->save();

    (new SendOnSlackService($message, $this->hook))->perform();

    expect($this->hook->refresh()->isDisabled())->toBeTrue();
});

it('bỏ mention markdown trước khi gửi ra Slack', function () {
    $this->conversation->update(['identifier' => 'random_slack_thread_ts']);
    slackPostMessageStub();

    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'content' => "Hi [@{$this->contact->name}](mention://user/{$this->contact->id}/{$this->contact->name}), welcome!",
    ]);
    $message->sender()->associate($this->contact);
    $message->save();

    (new SendOnSlackService($message, $this->hook))->perform();

    Http::assertSent(fn ($request) => $request['text'] === "Hi @{$this->contact->name}, welcome!");
});

it('tải tệp đính kèm lên Slack qua luồng files.getUploadURLExternal → completeUploadExternal', function () {
    Storage::fake('public');
    $this->conversation->update(['identifier' => 'random_slack_thread_ts']);

    Http::fake([
        'https://slack.com/api/chat.postMessage' => Http::response([
            'ok' => true, 'ts' => '12345.6789', 'message' => ['ts' => '6789.12345', 'thread_ts' => 'random_slack_thread_ts'],
        ]),
        'https://slack.com/api/files.getUploadURLExternal' => Http::response([
            'ok' => true, 'upload_url' => 'https://files.slack.com/upload/v1/abc', 'file_id' => 'F123',
        ]),
        'https://files.slack.com/*' => Http::response('ok'),
        'https://slack.com/api/files.completeUploadExternal' => Http::response(['ok' => true]),
    ]);

    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'content' => 'Xem tệp đính kèm',
    ]);
    $message->sender()->associate($this->contact);
    $message->save();

    Storage::disk('public')->put('attachments/test/avatar.png', 'binary');
    $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'disk' => 'public',
        'path' => 'attachments/test/avatar.png',
        'filename' => 'avatar.png',
        'content_type' => 'image/png',
        'byte_size' => 5,
    ]);
    $message->unsetRelation('attachments');

    (new SendOnSlackService($message, $this->hook))->perform();

    Http::assertSent(fn ($request) => $request->url() === 'https://slack.com/api/files.completeUploadExternal'
        && $request['channel_id'] === 'C123'
        && $request['thread_ts'] === 'random_slack_thread_ts'
        && $request['initial_comment'] === 'Attached File!');
});
