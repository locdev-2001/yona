<?php

use App\Jobs\Integrations\SlackUnfurlJob;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Integrations\Hook;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

// Port từ spec/jobs/slack_unfurl_job_spec.rb.

it('vào hàng đợi low', function () {
    Queue::fake();
    $hook = Hook::factory()->create();

    SlackUnfurlJob::dispatch(['event' => ['links' => []]]);

    Queue::assertPushedOn('low', SlackUnfurlJob::class);
});

it('unfurl khi bot còn quyền truy cập kênh', function () {
    $account = Account::factory()->create();
    $hook = Hook::factory()->create(['account_id' => $account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $account->id]);

    Http::fake([
        'https://slack.com/api/conversations.members' => Http::response(['ok' => true]),
        'https://slack.com/api/chat.unfurl' => Http::response(['ok' => true]),
    ]);

    $linkShared = [
        'event' => [
            'type' => 'link_shared',
            'channel' => 'G01354F6A6Q',
            'unfurl_id' => 'unfurl-1',
            'source' => 'conversations_history',
            'links' => [['url' => "https://qa.chatwoot.com/app/accounts/{$account->id}/conversations/{$conversation->display_id}"]],
        ],
    ];

    (new SlackUnfurlJob($linkShared))->handle();

    Http::assertSent(fn ($request) => $request->url() === 'https://slack.com/api/chat.unfurl');
});

it('không unfurl khi link thuộc account khác', function () {
    $account = Account::factory()->create();
    $anotherAccount = Account::factory()->create();
    Hook::factory()->create(['account_id' => $account->id]);

    Http::fake();

    $linkShared = [
        'event' => [
            'type' => 'link_shared',
            'channel' => 'X',
            'links' => [['url' => "https://qa.chatwoot.com/app/accounts/{$anotherAccount->id}/conversations/1"]],
        ],
    ];

    (new SlackUnfurlJob($linkShared))->handle();

    Http::assertNothingSent();
});

it('không unfurl khi bot không còn ở trong kênh (conversations.members trả lỗi)', function () {
    $account = Account::factory()->create();
    Hook::factory()->create(['account_id' => $account->id]);

    Http::fake(['https://slack.com/api/conversations.members' => Http::response(['ok' => false, 'error' => 'channel_not_found'], 404)]);

    $linkShared = [
        'event' => [
            'type' => 'link_shared',
            'channel' => 'GDF4F6A6Q',
            'links' => [['url' => "https://qa.chatwoot.com/app/accounts/{$account->id}/conversations/1"]],
        ],
    ];

    (new SlackUnfurlJob($linkShared))->handle();

    Http::assertNotSent(fn ($request) => $request->url() === 'https://slack.com/api/chat.unfurl');
});
