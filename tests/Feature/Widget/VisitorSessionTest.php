<?php

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use Tests\Support\WidgetSession;

// Vòng đời phiên khách của widget qua nhiều lần tải trang: token nhận ở /config đầu tiên
// là thứ duy nhất trình duyệt giữ lại. Gửi lại token đó phải ra đúng khách và đúng lịch sử.

function startVisitor(WidgetSession $session): array
{
    $config = test()->postJson($session->url('config'))->assertOk()->json();

    return [
        'token' => $config['website_channel_config']['auth_token'],
        'contactId' => $config['contact']['id'],
    ];
}

function sendVisitorMessage(WidgetSession $session, string $token, string $content): void
{
    test()->postJson(
        $session->url('messages'),
        ['message' => ['content' => $content, 'timestamp' => now()->toString(), 'referer_url' => 'https://shop.example/']],
        ['X-Auth-Token' => $token],
    )->assertOk();
}

it('returns the same visitor and the earlier messages when the page reloads with the stored token', function () {
    $session = WidgetSession::make();
    $visitor = startVisitor($session);
    sendVisitorMessage($session, $visitor['token'], 'Xin chào, còn hàng không?');
    $contactsBeforeReload = Contact::query()->count();
    $contactInboxesBeforeReload = ContactInbox::query()->count();

    $reloaded = $this->postJson($session->url('config'), [], ['X-Auth-Token' => $visitor['token']])->assertOk();

    expect($reloaded->json('contact.id'))->toBe($visitor['contactId'])
        ->and(Contact::query()->count())->toBe($contactsBeforeReload)
        ->and(ContactInbox::query()->count())->toBe($contactInboxesBeforeReload);

    $messages = $this->getJson($session->url('messages'), ['X-Auth-Token' => $reloaded->json('website_channel_config.auth_token')])
        ->assertOk()
        ->json('payload');

    expect(collect($messages)->pluck('content'))->toContain('Xin chào, còn hàng không?');
});

it('still shows the history of a resolved conversation after the page reloads', function () {
    $session = WidgetSession::make();
    $visitor = startVisitor($session);
    sendVisitorMessage($session, $visitor['token'], 'Cảm ơn shop');
    Conversation::query()->where('inbox_id', $session->inbox->id)->update(['status' => Conversation::STATUS_RESOLVED]);

    $messages = $this->getJson($session->url('messages'), ['X-Auth-Token' => $visitor['token']])
        ->assertOk()
        ->json('payload');

    expect(collect($messages)->pluck('content'))->toContain('Cảm ơn shop');
});

it('starts a new visitor without the earlier messages when the token is dropped', function () {
    $session = WidgetSession::make();
    $visitor = startVisitor($session);
    sendVisitorMessage($session, $visitor['token'], 'Tin của khách cũ');

    $freshVisitor = startVisitor($session);

    expect($freshVisitor['contactId'])->not->toBe($visitor['contactId']);

    $messages = $this->getJson($session->url('messages'), ['X-Auth-Token' => $freshVisitor['token']])
        ->assertOk()
        ->json('payload');

    expect($messages)->toBe([]);
});
