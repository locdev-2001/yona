<?php

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use Tests\Support\WidgetSession;

// Vòng đời phiên khách của widget qua nhiều lần tải trang: token nhận ở /config đầu tiên
// là thứ duy nhất trình duyệt giữ lại. /config không ghi DB — contact/contact_inbox chỉ
// dựng khi khách gửi tin đầu tiên; gửi lại token đó (trước hay sau khi có tin) phải ra
// đúng khách và đúng lịch sử.

function startVisitor(WidgetSession $session): string
{
    return test()->postJson($session->url('config'))->assertOk()->json('website_channel_config.auth_token');
}

function contactIdFor(WidgetSession $session, string $token): ?int
{
    return test()->postJson($session->url('config'), [], ['X-Auth-Token' => $token])->assertOk()->json('contact.id');
}

function sendVisitorMessage(WidgetSession $session, string $token, string $content): void
{
    test()->postJson(
        $session->url('messages'),
        ['message' => ['content' => $content, 'timestamp' => now()->toString(), 'referer_url' => 'https://shop.example/']],
        ['X-Auth-Token' => $token],
    )->assertOk();
}

it('does not create a contact until the visitor sends the first message', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();

    $token = startVisitor($session);
    expect(contactIdFor($session, $token))->toBeNull()
        ->and(Contact::query()->count())->toBe($before);

    sendVisitorMessage($session, $token, 'Xin chào, còn hàng không?');

    expect(contactIdFor($session, $token))->not->toBeNull()
        ->and(Contact::query()->count())->toBe($before + 1);
});

it('khung xem trước ở màn cấu hình (widget?preview=1) mở widget thật mà không đẻ liên hệ nháp', function () {
    $session = WidgetSession::make();
    $contactsBefore = Contact::query()->count();
    $contactInboxesBefore = ContactInbox::query()->count();

    $this->get('/widget?'.http_build_query(['website_token' => $session->channel->website_token, 'preview' => 1]))->assertOk();
    // Đúng những gì widget ở chế độ xem trước gọi: /config (đọc dù là POST) và các GET;
    // mọi POST khác bị chặn ngay ở client widget (resources/js/widget/api/client.ts).
    $token = startVisitor($session);
    foreach (['inbox_members', 'campaigns', 'updates', 'conversations/list'] as $readPath) {
        $this->getJson($session->url($readPath), ['X-Auth-Token' => $token])->assertOk();
    }

    expect(Contact::query()->count())->toBe($contactsBefore)
        ->and(ContactInbox::query()->count())->toBe($contactInboxesBefore);
});

it('returns the same visitor and the earlier messages when the page reloads with the stored token', function () {
    $session = WidgetSession::make();
    $token = startVisitor($session);
    sendVisitorMessage($session, $token, 'Xin chào, còn hàng không?');
    $contactId = contactIdFor($session, $token);
    $contactsBeforeReload = Contact::query()->count();
    $contactInboxesBeforeReload = ContactInbox::query()->count();

    $reloaded = $this->postJson($session->url('config'), [], ['X-Auth-Token' => $token])->assertOk();

    expect($reloaded->json('contact.id'))->toBe($contactId)
        ->and(Contact::query()->count())->toBe($contactsBeforeReload)
        ->and(ContactInbox::query()->count())->toBe($contactInboxesBeforeReload);

    $messages = $this->getJson($session->url('messages'), ['X-Auth-Token' => $reloaded->json('website_channel_config.auth_token')])
        ->assertOk()
        ->json('payload');

    expect(collect($messages)->pluck('content'))->toContain('Xin chào, còn hàng không?');
});

it('still shows the history of a resolved conversation after the page reloads', function () {
    $session = WidgetSession::make();
    $token = startVisitor($session);
    sendVisitorMessage($session, $token, 'Cảm ơn shop');
    Conversation::query()->where('inbox_id', $session->inbox->id)->update(['status' => Conversation::STATUS_RESOLVED]);

    $messages = $this->getJson($session->url('messages'), ['X-Auth-Token' => $token])
        ->assertOk()
        ->json('payload');

    expect(collect($messages)->pluck('content'))->toContain('Cảm ơn shop');
});

it('starts a new visitor without the earlier messages when the token is dropped', function () {
    $session = WidgetSession::make();
    $token = startVisitor($session);
    sendVisitorMessage($session, $token, 'Tin của khách cũ');

    $freshToken = startVisitor($session);
    sendVisitorMessage($session, $freshToken, 'Tin của khách mới');

    expect(contactIdFor($session, $freshToken))->not->toBe(contactIdFor($session, $token));

    $messages = $this->getJson($session->url('messages'), ['X-Auth-Token' => $freshToken])
        ->assertOk()
        ->json('payload');

    expect(collect($messages)->pluck('content'))
        ->toContain('Tin của khách mới')
        ->not->toContain('Tin của khách cũ');
});
