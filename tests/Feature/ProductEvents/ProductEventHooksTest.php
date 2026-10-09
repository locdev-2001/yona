<?php

use App\Jobs\Inboxes\FetchImapEmailsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBotInbox;
use App\Models\Article;
use App\Models\AutomationRule;
use App\Models\Campaign;
use App\Models\CannedResponse;
use App\Models\Channel\Email;
use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Models\DataImport;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Macro;
use App\Models\Message;
use App\Models\ProductEvent;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\User;
use App\Models\Webhook;
use App\Services\AccountSignUpService;
use App\Services\AutomationRules\ActionService;
use App\Services\Imap\FetchEmailService;
use App\Services\Macros\ExecutionService;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Mỗi điểm ghi sự kiện sản phẩm thật: đăng ký, xác nhận email, onboarding, hộp thư,
// kết nối kênh (token, QR Zalo, IMAP, widget), tin đầu tiên, và từng tính năng.

/** @return list<ProductEvent> */
function productEventsNamed(string $name): array
{
    return ProductEvent::query()->where('name', $name)->orderBy('id')->get()->all();
}

function productEventAdmin(Account $account): User
{
    $user = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $user->id]);

    return $user;
}

it('đăng ký bằng mật khẩu ghi account_signed_up, chưa xác nhận email', function () {
    $user = app(AccountSignUpService::class)->signUp('lan@shopmebe.vn', 'Password1!', 'Shop Mẹ Bé', 'Chị Lan', false);
    $accountId = AccountUser::query()->where('user_id', $user->id)->value('account_id');

    $signedUp = productEventsNamed('account_signed_up');

    expect($signedUp)->toHaveCount(1)
        ->and($signedUp[0]->account_id)->toBe($accountId)
        ->and($signedUp[0]->user_id)->toBe($user->id)
        ->and($signedUp[0]->properties)->toBe(['method' => 'password'])
        ->and(productEventsNamed('email_confirmed'))->toBe([]);

    // Bấm link xác nhận: confirmed_at từ null sang có giá trị.
    $user->update(['confirmed_at' => now()]);
    $user->update(['confirmed_at' => now()->addMinute()]);

    $confirmed = productEventsNamed('email_confirmed');
    expect($confirmed)->toHaveCount(1)
        ->and($confirmed[0]->account_id)->toBe($accountId)
        ->and($confirmed[0]->user_id)->toBe($user->id);
});

it('đăng ký bằng nhà cung cấp OAuth đã xác minh email thì ghi luôn email_confirmed', function () {
    app(AccountSignUpService::class)->signUp('minh@cuahang.vn', null, 'Cửa hàng Minh', 'Anh Minh', true);

    expect(productEventsNamed('account_signed_up')[0]->properties)->toBe(['method' => 'oauth'])
        ->and(productEventsNamed('email_confirmed'))->toHaveCount(1);
});

it('xong bước onboarding ghi tên bước vừa qua', function () {
    $account = Account::factory()->create(['custom_attributes' => [Account::ONBOARDING_STEP_KEY => 'account_details']]);

    $account->finishOnboarding();
    $account->update(['name' => 'Đổi tên sau']);

    $events = productEventsNamed('onboarding_step_completed');
    expect($events)->toHaveCount(1)
        ->and($events[0]->properties)->toBe(['step' => 'account_details']);
});

it('tạo hộp thư ghi inbox_created; kênh token ghi luôn channel_connected, kênh API thì không', function () {
    $account = Account::factory()->create();
    $api = Inbox::factory()->create(['account_id' => $account->id]);
    $telegram = Inbox::factory()->telegram()->create(['account_id' => $account->id]);

    expect(collect(productEventsNamed('inbox_created'))->map(fn ($event) => $event->properties['inbox_id'])->all())->toBe([$api->id, $telegram->id]);

    $connected = productEventsNamed('channel_connected');
    expect($connected)->toHaveCount(1)
        ->and($connected[0]->properties)->toEqualCanonicalizing(['inbox_id' => $telegram->id, 'platform' => 'telegram', 'method' => 'token']);
});

it('quét QR Zalo xong ghi channel_connected một lần cho hộp thư', function () {
    $account = Account::factory()->create();
    $admin = productEventAdmin($account);
    $inbox = Inbox::factory()->zalo()->create(['account_id' => $account->id]);
    $inbox->channel->update(['zalo_uid' => null, 'state' => Zalo::STATE_QR_WAITING, 'qr_token' => 'token-1']);
    Http::fake([
        zaloBridgePattern('auth/qr/promote') => Http::response(['personal_uid' => '1234567890', 'display_name' => 'Chủ shop']),
        zaloBridgePattern('*') => Http::response(['ok' => true]),
    ]);
    Queue::fake();

    $this->actingAs($admin)->postJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/zalo/promote")->assertOk();

    $connected = productEventsNamed('channel_connected');
    expect($connected)->toHaveCount(1)
        ->and($connected[0]->properties)->toEqualCanonicalizing(['inbox_id' => $inbox->id, 'platform' => 'zalo', 'method' => 'qr'])
        ->and($connected[0]->user_id)->toBe($admin->id);
});

it('IMAP lấy thư thành công lần đầu ghi channel_connected (imap)', function () {
    Storage::fake('public');
    $account = Account::factory()->create();
    $channel = Email::factory()->create(['account_id' => $account->id, 'email' => 'care@example.com', 'imap_enabled' => true]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id, 'channel_id' => $channel->id, 'channel_type' => 'Channel::Email']);
    $fetcher = Mockery::mock(FetchEmailService::class);
    $fetcher->shouldReceive('perform')->twice()->andReturn([]);
    $fetcher->shouldReceive('commitSyncProgress')->twice();
    app()->bind(FetchEmailService::class, fn () => $fetcher);

    (new FetchImapEmailsJob($channel->fresh()))->handle();
    (new FetchImapEmailsJob($channel->fresh()))->handle();

    expect(collect(productEventsNamed('channel_connected'))->pluck('properties.method')->sort()->values()->all())->toBe(['imap', 'token'])
        ->and(collect(productEventsNamed('channel_connected'))->pluck('properties.inbox_id')->unique()->all())->toBe([$inbox->id]);
});

it('IMAP lỗi kết nối thì không ghi', function () {
    $account = Account::factory()->create();
    $channel = Email::factory()->create(['account_id' => $account->id, 'email' => 'care@example.com', 'imap_enabled' => true]);
    Inbox::factory()->create(['account_id' => $account->id, 'channel_id' => $channel->id, 'channel_type' => 'Channel::Email']);
    $fetcher = Mockery::mock(FetchEmailService::class);
    $fetcher->shouldReceive('perform')->andThrow(new RuntimeException('auth failed'));
    app()->bind(FetchEmailService::class, fn () => $fetcher);

    (new FetchImapEmailsJob($channel->fresh()))->handle();

    expect(collect(productEventsNamed('channel_connected'))->pluck('properties.method')->all())->toBe(['token']);
});

it('widget mở từ website của khách ghi channel_connected (widget_embed) một lần; xem trước và trang Yona không tính', function () {
    $inbox = Inbox::factory()->webWidget()->create();
    $token = $inbox->channel->website_token;

    $this->get("/widget?website_token={$token}", ['Referer' => 'http://localhost/app/settings'])->assertOk();
    $this->get("/widget?website_token={$token}&preview=1", ['Referer' => 'https://shopmebe.vn/'])->assertOk();
    expect(productEventsNamed('channel_connected'))->toBe([]);

    $this->get("/widget?website_token={$token}", ['Referer' => 'https://shopmebe.vn/san-pham'])->assertOk();
    $this->get("/widget?website_token={$token}", ['Referer' => 'https://shopmebe.vn/gio-hang'])->assertOk();

    $connected = productEventsNamed('channel_connected');
    expect($connected)->toHaveCount(1)
        ->and($connected[0]->properties)->toEqualCanonicalizing(['inbox_id' => $inbox->id, 'platform' => 'website', 'method' => 'widget_embed']);
});

it('tin khách đầu tiên và lần trả lời đầu tiên của account chỉ ghi một lần', function () {
    $account = Account::factory()->create();
    $agent = productEventAdmin($account);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    Message::factory()->count(2)->create(['account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id]);
    Message::factory()->outgoing()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id, 'private' => true, 'sender_type' => 'User', 'sender_id' => $agent->id]);
    expect(productEventsNamed('first_outbound_reply'))->toBe([]);

    Message::factory()->outgoing()->count(2)->create(['account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id, 'sender_type' => 'User', 'sender_id' => $agent->id]);

    $inbound = productEventsNamed('first_inbound_message');
    $reply = productEventsNamed('first_outbound_reply');
    expect($inbound)->toHaveCount(1)
        ->and($inbound[0]->properties)->toEqualCanonicalizing(['inbox_id' => $inbox->id, 'platform' => 'api'])
        ->and($reply)->toHaveCount(1)
        ->and($reply[0]->user_id)->toBe($agent->id);
});

it('gửi sticker và tin có cấu trúc ghi mỗi tin một sự kiện, không lưu nội dung', function () {
    $account = Account::factory()->create();
    $agent = productEventAdmin($account);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);
    $base = ['account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id, 'sender_type' => 'User', 'sender_id' => $agent->id];

    $sticker = Message::factory()->outgoing()->create([...$base, 'content' => null, 'content_type' => Message::CONTENT_TYPES['sticker'], 'content_attributes' => ['sticker' => ['id' => 'yona:12']]]);
    Message::factory()->outgoing()->create([...$base, 'content' => 'Chọn size giúp em ạ', 'content_type' => Message::CONTENT_TYPES['input_select'], 'content_attributes' => ['items' => [['title' => 'S']]]]);
    Message::factory()->create([...$base, 'sender_type' => null, 'sender_id' => null, 'content_type' => Message::CONTENT_TYPES['sticker'], 'content_attributes' => ['sticker' => ['id' => 'zalo:1']]]);

    $stickers = productEventsNamed('sticker_sent');
    $structured = productEventsNamed('structured_message_sent');
    expect($stickers)->toHaveCount(1)
        ->and($stickers[0]->properties)->toEqualCanonicalizing(['source' => 'yona', 'inbox_id' => $inbox->id])
        ->and($stickers[0]->dedupe_key)->toBe("sticker_sent:{$sticker->id}")
        ->and($structured)->toHaveCount(1)
        ->and($structured[0]->properties)->toEqualCanonicalizing(['type' => 'input_select', 'inbox_id' => $inbox->id])
        ->and(json_encode($structured[0]->properties))->not->toContain('size');
});

it('chạy macro ghi macro_run kèm số hội thoại; macro gửi thẻ mẫu ghi canned_response_used', function () {
    Queue::fake();
    $account = Account::factory()->create();
    $admin = productEventAdmin($account);
    $macro = Macro::factory()->create(['account_id' => $account->id, 'created_by_id' => $admin->id, 'updated_by_id' => $admin->id, 'visibility' => 'global']);

    $this->actingAs($admin)
        ->postJson("/api/v1/accounts/{$account->id}/macros/{$macro->id}/execute", ['conversation_ids' => [1, 2]])
        ->assertOk();

    $run = productEventsNamed('macro_run');
    expect($run)->toHaveCount(1)
        ->and($run[0]->properties)->toEqualCanonicalizing(['macro_id' => $macro->id, 'conversations' => 2])
        ->and($run[0]->user_id)->toBe($admin->id);

    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);
    $canned = CannedResponse::query()->create([
        'account_id' => $account->id,
        'short_code' => 'size',
        'content' => 'Chị chọn size giúp em ạ',
        'content_type' => 'input_select',
        'content_attributes' => ['items' => [['title' => 'S'], ['title' => 'M']]],
    ]);
    $cardMacro = Macro::factory()->create([
        'account_id' => $account->id,
        'created_by_id' => $admin->id,
        'actions' => [['action_name' => 'send_canned_card', 'action_params' => [$canned->id]]],
    ]);

    (new ExecutionService($cardMacro, $conversation, $admin))->perform();

    $used = productEventsNamed('canned_response_used');
    expect($used)->toHaveCount(1)
        ->and($used[0]->properties)->toEqualCanonicalizing(['canned_response_id' => $canned->id, 'via' => 'macro']);
});

it('chèn câu trả lời mẫu ở ô soạn ghi canned_response_used qua endpoint riêng', function () {
    $account = Account::factory()->create();
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id]);
    $canned = CannedResponse::query()->create(['account_id' => $account->id, 'short_code' => 'chao', 'content' => 'Chào chị']);
    $other = CannedResponse::query()->create(['account_id' => Account::factory()->create()->id, 'short_code' => 'x', 'content' => 'x']);

    $this->postJson("/api/v1/accounts/{$account->id}/canned_responses/{$canned->id}/usages")->assertUnauthorized();
    $this->actingAs($agent)->postJson("/api/v1/accounts/{$account->id}/canned_responses/{$other->id}/usages")->assertNotFound();
    $this->actingAs($agent)->postJson("/api/v1/accounts/{$account->id}/canned_responses/{$canned->id}/usages")->assertNoContent();

    $used = productEventsNamed('canned_response_used');
    expect($used)->toHaveCount(1)
        ->and($used[0]->properties)->toEqualCanonicalizing(['canned_response_id' => $canned->id, 'via' => 'composer'])
        ->and($used[0]->user_id)->toBe($agent->id);
});

it('luật tự động: tạo và mỗi lần chạy đều ghi', function () {
    $account = Account::factory()->create();
    // Hội thoại tạo trước luật: không để luật tự chạy vì chính hội thoại này.
    $conversation = Conversation::factory()->create(['account_id' => $account->id]);
    $rule = AutomationRule::factory()->create(['account_id' => $account->id, 'actions' => []]);

    (new ActionService($rule, $account, $conversation))->perform();
    (new ActionService($rule, $account, $conversation))->perform();

    expect(productEventsNamed('automation_rule_created'))->toHaveCount(1)
        ->and(productEventsNamed('automation_rule_created')[0]->properties)->toEqualCanonicalizing(['automation_rule_id' => $rule->id, 'event' => 'conversation_created'])
        ->and(productEventsNamed('automation_rule_fired'))->toHaveCount(2);
});

it('xuất liên hệ CSV ghi contacts_exported; nhập CSV ghi contacts_imported', function () {
    Queue::fake();
    $account = Account::factory()->create();
    $admin = productEventAdmin($account);

    $this->actingAs($admin)->postJson("/api/v1/accounts/{$account->id}/contacts/export")->assertOk();
    $import = DataImport::factory()->create(['account_id' => $account->id]);

    expect(productEventsNamed('contacts_exported'))->toHaveCount(1)
        ->and(productEventsNamed('contacts_exported')[0]->properties)->toBe(['filtered' => false])
        ->and(productEventsNamed('contacts_imported')[0]->properties)->toBe(['data_import_id' => $import->id]);
});

it('tạo nhãn, webhook, chiến dịch, gắn agent bot ghi theo id bản ghi', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);

    $label = Label::factory()->create(['account_id' => $account->id]);
    $webhook = Webhook::factory()->create(['account_id' => $account->id]);
    $campaign = Campaign::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);
    $connection = AgentBotInbox::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    expect(productEventsNamed('label_created')[0]->properties)->toBe(['label_id' => $label->id])
        ->and(productEventsNamed('webhook_created')[0]->dedupe_key)->toBe("webhook_created:{$webhook->id}")
        ->and(productEventsNamed('campaign_created')[0]->properties)->toEqualCanonicalizing(['campaign_id' => $campaign->id, 'platform' => 'website'])
        ->and(productEventsNamed('agent_bot_connected')[0]->properties)->toEqualCanonicalizing(['agent_bot_id' => $connection->agent_bot_id, 'inbox_id' => $inbox->id]);
});

it('bài Help Center ghi lần đầu xuất bản, nháp thì chưa', function () {
    $account = Account::factory()->create();
    $draft = Article::factory()->create(['account_id' => $account->id, 'status' => 'draft']);
    expect(productEventsNamed('help_center_article_published'))->toBe([]);

    $draft->update(['status' => 'published']);
    $draft->update(['title' => 'Sửa tiêu đề']);
    $draft->update(['status' => 'draft']);
    $draft->update(['status' => 'published']);
    Article::factory()->create(['account_id' => $account->id]);

    expect(productEventsNamed('help_center_article_published'))->toHaveCount(2);
});

it('sticker tải lên kho riêng ghi, kho nền tảng không tính', function () {
    $account = Account::factory()->create();
    $own = StickerPack::factory()->create(['account_id' => $account->id]);
    $platform = StickerPack::factory()->create(['account_id' => null]);

    Sticker::factory()->create(['sticker_pack_id' => $own->id]);
    Sticker::factory()->create(['sticker_pack_id' => $platform->id]);

    $uploaded = productEventsNamed('sticker_uploaded');
    expect($uploaded)->toHaveCount(1)
        ->and($uploaded[0]->account_id)->toBe($account->id);
});
