<?php

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Support\WidgetTokenService;
use Tests\Support\WidgetSession;

// Hợp đồng cốt lõi: tải trang có widget KHÔNG được tạo liên hệ; contact +
// contact_inbox chỉ dựng ở hành động THẬT đầu tiên của khách.

function pendingToken(WidgetSession $session): string
{
    return test()->postJson($session->url('config'))->assertOk()->json('website_channel_config.auth_token');
}

it('creates zero contacts no matter how many times the widget config is loaded', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();
    $beforeInboxes = ContactInbox::query()->count();

    foreach (range(1, 5) as $ignored) {
        $this->postJson($session->url('config'))->assertOk();
    }

    // Cùng một token (không có trong request) tải lại nhiều lần cũng vậy.
    $token = pendingToken($session);
    foreach (range(1, 5) as $ignored) {
        $this->postJson($session->url('config'), [], ['X-Auth-Token' => $token])->assertOk();
    }

    expect(Contact::query()->count())->toBe($before)
        ->and(ContactInbox::query()->count())->toBe($beforeInboxes);
});

it('creates exactly one contact when the visitor sends the first message', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();
    $token = pendingToken($session);

    $this->postJson(
        $session->url('messages'),
        ['message' => ['content' => 'Còn hàng không shop?', 'timestamp' => now()->toString()]],
        ['X-Auth-Token' => $token],
    )->assertOk();

    expect(Contact::query()->count())->toBe($before + 1);
});

it('lazily creates a contact when the visitor submits the out-of-hours email form via PUT /contact', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();
    $token = pendingToken($session);

    $this->putJson($session->url('contact'), ['email' => 'khach@example.com'], ['X-Auth-Token' => $token])
        ->assertOk();

    expect(Contact::query()->count())->toBe($before + 1)
        ->and(Contact::query()->latest('id')->first()->email)->toBe('khach@example.com');
});

it('lazily creates a contact when the visitor starts a conversation via the pre-chat form', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();
    $token = pendingToken($session);

    $this->postJson($session->url('conversations'), [
        'contact' => ['name' => 'Khách mới', 'email' => 'moi@example.com'],
        'message' => ['content' => 'Chào shop'],
    ], ['X-Auth-Token' => $token])->assertOk();

    expect(Contact::query()->count())->toBe($before + 1)
        ->and(Contact::query()->latest('id')->first()->email)->toBe('moi@example.com');
});

it('lazily creates a contact when the visitor identifies via SDK setUser', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();
    $token = pendingToken($session);

    $this->patchJson($session->url('contact/set_user'), ['identifier' => 'user-42'], ['X-Auth-Token' => $token])
        ->assertOk();

    expect(Contact::query()->count())->toBe($before + 1)
        ->and(Contact::query()->latest('id')->first()->identifier)->toBe('user-42');
});

it('reuses the contact_inbox another request already created for the same pending token instead of duplicating it', function () {
    $session = WidgetSession::make();
    $token = pendingToken($session);
    $sourceId = WidgetTokenService::decode($token)['source_id'];

    // Giả lập luồng khác đã thắng cuộc đua với CÙNG source_id treo ngay trước
    // khi luồng này chạy tới bước ghi.
    $racingContact = Contact::factory()->create(['account_id' => $session->account->id]);
    $racingContactInbox = ContactInbox::factory()->create([
        'contact_id' => $racingContact->id,
        'inbox_id' => $session->inbox->id,
        'source_id' => $sourceId,
    ]);

    $this->postJson(
        $session->url('messages'),
        ['message' => ['content' => 'Tin đầu tiên', 'timestamp' => now()->toString()]],
        ['X-Auth-Token' => $token],
    )->assertOk();

    expect(ContactInbox::query()->where('inbox_id', $session->inbox->id)->where('source_id', $sourceId)->count())->toBe(1)
        ->and($racingContactInbox->fresh()->conversations()->count())->toBe(1);

    $reloaded = $this->postJson($session->url('config'), [], ['X-Auth-Token' => $token])->assertOk();
    expect($reloaded->json('contact.id'))->toBe($racingContact->id);
});
