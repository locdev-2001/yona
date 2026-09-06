<?php

use App\Jobs\Integrations\SlackUnfurlJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Integrations\Hook;
use App\Models\User;
use App\Services\Integrations\Slack\IncomingMessageBuilder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Port từ spec/lib/integrations/slack/incoming_message_builder_spec.rb.

function slackMessageEvent(array $overrides = []): array
{
    return array_replace_recursive([
        'client_msg_id' => 'ffc6e64e-6f0c-4a3d-b594-faa6b44e48ab',
        'type' => 'message',
        'text' => 'this is test <https://chatwoot.com> Hey <@U019KT237LP|Sojan> Test again',
        'user' => 'ULYPAKE5S',
        'ts' => '1588623033.006000',
        'thread_ts' => '1588623023.005900',
        'channel' => 'G01354F6A6Q',
        'blocks' => [['type' => 'rich_text', 'block_id' => 'jaIv3']],
    ], $overrides);
}

function slackCallbackPayload(array $eventOverrides = []): array
{
    return [
        'team_id' => 'TLST3048H',
        'type' => 'event_callback',
        'event_time' => 1588623033,
        'event' => slackMessageEvent($eventOverrides),
    ];
}

// Http::fake() ghép chồng theo THỨ TỰ ĐĂNG KÝ — stub khớp URL sớm nhất thắng
// (PendingRequest::buildStubHandler dùng ->first() trên danh sách callback).
// Vì vậy KHÔNG đặt fake mặc định ở beforeEach (nó sẽ luôn thắng fake riêng của
// từng test); mỗi test tự khai fake của users.info nó cần.
function fakeSlackUsersInfo(array $overrides = []): void
{
    Http::fake(array_merge([
        'https://slack.com/api/users.info*' => Http::response(['ok' => true, 'user' => ['profile' => ['email' => null]]]),
    ], $overrides));
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->hook = Hook::factory()->create(['account_id' => $this->account->id, 'reference_id' => 'G01354F6A6Q']);
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'identifier' => '1588623023.005900']);
});

it('trả challenge cho url_verification', function () {
    $response = (new IncomingMessageBuilder(['type' => 'url_verification', 'challenge' => 'abc123']))->perform();

    expect($response)->toBe(['challenge' => 'abc123']);
});

it('không tạo tin khi thiếu thread_ts', function () {
    fakeSlackUsersInfo();
    $count = $this->conversation->messages()->count();
    $payload = slackCallbackPayload(['thread_ts' => null]);

    (new IncomingMessageBuilder($payload))->perform();

    expect($this->conversation->messages()->count())->toBe($count);
});

it('tạo tin outgoing với nội dung đã gỡ định dạng Slack', function () {
    fakeSlackUsersInfo();
    $payload = slackCallbackPayload();

    $response = (new IncomingMessageBuilder($payload))->perform();

    expect($response)->toBe(['status' => 'success']);
    $message = $this->conversation->messages()->latest('id')->first();
    expect($message->content)->toBe('this is test https://chatwoot.com Hey @Sojan Test again')
        ->and($message->private)->toBeFalse();
});

it('không tạo tin trùng khi ts đã tồn tại', function () {
    fakeSlackUsersInfo();
    $payload = slackCallbackPayload();

    (new IncomingMessageBuilder($payload))->perform();
    (new IncomingMessageBuilder($payload))->perform();

    expect($this->conversation->messages()->count())->toBe(1);
});

it('tạo ghi chú riêng tư khi nội dung bắt đầu bằng private:', function () {
    fakeSlackUsersInfo();
    $payload = slackCallbackPayload(['text' => 'private: A private note message']);

    (new IncomingMessageBuilder($payload))->perform();

    $message = $this->conversation->messages()->latest('id')->first();
    expect($message->private)->toBeTrue()
        ->and($message->content)->toBe('private: A private note message');
});

it('bỏ qua sự kiện có subtype (tin của bot/hệ thống)', function () {
    $count = $this->conversation->messages()->count();
    $payload = slackCallbackPayload(['subtype' => 'bot_message']);

    (new IncomingMessageBuilder($payload))->perform();

    expect($this->conversation->messages()->count())->toBe($count);
});

it('bỏ qua khi thiếu user', function () {
    $count = $this->conversation->messages()->count();
    $payload = slackCallbackPayload(['user' => null]);

    (new IncomingMessageBuilder($payload))->perform();

    expect($this->conversation->messages()->count())->toBe($count);
});

it('bỏ qua postback tự sinh khi Chatwoot gửi tệp ra Slack ("Attached File!")', function () {
    $count = $this->conversation->messages()->count();
    $payload = slackCallbackPayload(['text' => 'Attached File!', 'files' => [['mimetype' => 'image/png']]]);

    (new IncomingMessageBuilder($payload))->perform();

    expect($this->conversation->messages()->count())->toBe($count);
});

it('lưu tệp đính kèm khi event có files', function () {
    Storage::fake('public');
    Http::fake([
        'https://slack.com/api/users.info*' => Http::response(['ok' => true, 'user' => ['profile' => ['email' => null]]]),
        'https://chatwoot-assets.local/*' => Http::response('fake-binary-content', 200),
    ]);

    $payload = slackCallbackPayload([
        'blocks' => null,
        'files' => [[
            'mimetype' => 'image/png',
            'url_private' => 'https://chatwoot-assets.local/sample.png',
            'name' => 'sample.png',
            'filetype' => 'png',
        ]],
    ]);

    (new IncomingMessageBuilder($payload))->perform();

    $message = $this->conversation->messages()->latest('id')->first();
    expect($message->attachments)->toHaveCount(1)
        ->and($message->attachments->first()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE);
});

it('gọi SlackUnfurlJob khi sự kiện là link_shared', function () {
    Queue::fake();

    $payload = [
        'team_id' => 'TLST3048H',
        'type' => 'event_callback',
        'event_time' => 1588623033,
        'event' => ['type' => 'link_shared', 'user' => 'ULYPAKE5S', 'channel' => 'G01354F6A6Q'],
    ];

    (new IncomingMessageBuilder($payload))->perform();

    Queue::assertPushed(SlackUnfurlJob::class, fn ($job) => $job->params === $payload);
});

it('gán người gửi là agent Chatwoot khi email Slack khớp', function () {
    $agent = User::factory()->create(['email' => 'agent@example.com']);
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $agent->id]);

    Http::fake(['https://slack.com/api/users.info*' => Http::response([
        'ok' => true,
        'user' => ['profile' => ['email' => 'agent@example.com', 'display_name' => 'Agent Name'], 'real_name' => 'Agent Name', 'name' => 'agent'],
    ])]);

    $payload = slackCallbackPayload();
    (new IncomingMessageBuilder($payload))->perform();

    $message = $this->conversation->messages()->latest('id')->first();
    expect($message->sender_type)->toBe('User')
        ->and($message->sender_id)->toBe($agent->id)
        ->and($message->additional_attributes)->not->toHaveKey('sender_name');
});

it('lưu sender_name/sender_avatar_url khi email Slack không khớp agent nào', function () {
    Http::fake(['https://slack.com/api/users.info*' => Http::response([
        'ok' => true,
        'user' => ['profile' => ['email' => 'unknown@example.com', 'display_name' => 'Muhsin K', 'image_192' => 'https://avatars.slack-edge.com/avatar.png'], 'real_name' => 'Muhsin K', 'name' => 'muhsink'],
    ])]);

    $payload = slackCallbackPayload();
    (new IncomingMessageBuilder($payload))->perform();

    $message = $this->conversation->messages()->latest('id')->first();
    expect($message->sender_id)->toBeNull()
        ->and($message->additional_attributes['sender_name'])->toBe('Muhsin K')
        ->and($message->additional_attributes['sender_avatar_url'])->toBe('https://avatars.slack-edge.com/avatar.png');
});
