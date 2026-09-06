<?php

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Services\Integrations\Slack\SlackLinkUnfurlService;
use Illuminate\Support\Facades\Http;

// Port từ spec/lib/integrations/slack/slack_link_unfurl_service_spec.rb.

beforeEach(function () {
    $this->contact = Contact::factory()->create(['name' => 'Contact 1', 'email' => null]);
    $this->inbox = Inbox::factory()->email()->create(['account_id' => $this->contact->account_id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->contact->account_id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->contact->id,
        'identifier' => null,
    ]);
    $this->hook = Hook::factory()->create(['account_id' => $this->contact->account_id]);
});

it('không gửi gì khi sự kiện không có link nào', function () {
    Http::fake();

    $result = (new SlackLinkUnfurlService(['event' => ['links' => []]], $this->hook))->perform();

    expect($result)->toBe([]);
    Http::assertNothingSent();
});

it('không unfurl khi account trong url không khớp account của hook', function () {
    Http::fake();

    $params = ['event' => ['links' => [['url' => 'https://qa.chatwoot.com/app/accounts/999999/conversations/1']]]];
    (new SlackLinkUnfurlService($params, $this->hook))->perform();

    Http::assertNothingSent();
});

it('không unfurl khi hội thoại không thuộc account của hook', function () {
    Http::fake();

    $params = ['event' => ['links' => [['url' => "https://qa.chatwoot.com/app/accounts/{$this->hook->account_id}/conversations/999999"]]]];
    (new SlackLinkUnfurlService($params, $this->hook))->perform();

    Http::assertNothingSent();
});

it('gửi POST chat.unfurl với preview đúng khi link hợp lệ', function () {
    Http::fake(['https://slack.com/api/chat.unfurl' => Http::response(['ok' => true])]);

    $url = "https://qa.chatwoot.com/app/accounts/{$this->hook->account_id}/conversations/{$this->conversation->display_id}";
    $params = [
        'event' => [
            'unfurl_id' => 'unfurl-1',
            'source' => 'conversations_history',
            'links' => [['url' => $url]],
        ],
    ];

    (new SlackLinkUnfurlService($params, $this->hook))->perform();

    Http::assertSent(function ($request) use ($url) {
        $unfurls = json_decode($request['unfurls'], true);

        return $request->url() === 'https://slack.com/api/chat.unfurl'
            && $request['unfurl_id'] === 'unfurl-1'
            && $request['source'] === 'conversations_history'
            && array_key_exists($url, $unfurls)
            && str_contains(json_encode($unfurls[$url]), 'Contact 1');
    });
});
