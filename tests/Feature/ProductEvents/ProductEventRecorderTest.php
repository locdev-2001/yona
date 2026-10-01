<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Label;
use App\Models\ProductEvent;
use App\Models\SuperAdminImpersonation;
use App\Models\User;
use App\Services\ProductEvents\ProductEventName;
use App\Services\ProductEvents\ProductEventRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

// Recorder sự kiện sản phẩm: thuộc tính chỉ id/số/mã ngắn, chống trùng, không bao
// giờ làm hỏng nghiệp vụ, không tính lượt super admin làm hộ là tenant dùng tính năng.

function productEventRecorder(): ProductEventRecorder
{
    return app(ProductEventRecorder::class);
}

// Giả lập request hiện tại (đường dẫn + phiên) cho phần kiểm tra "ai đang thao tác".
function productEventRequest(string $path, array $session = []): void
{
    $request = Request::create($path);
    $store = app('session')->driver();
    $store->flush();
    foreach ($session as $key => $value) {
        $store->put($key, $value);
    }
    $request->setLaravelSession($store);
    app()->instance('request', $request);
}

it('ghi một dòng, thuộc tính chỉ giữ khoá snake_case và giá trị vô hướng ngắn', function () {
    $account = Account::factory()->create();
    $user = User::factory()->create();

    productEventRecorder()->record(ProductEventName::MacroRun, $account, [
        'macro_id' => 5,
        'ok' => true,
        'note' => 'ngắn',
        'content' => str_repeat('nội dung tin nhắn ', 10),
        'contact' => ['name' => 'Chị Lan', 'phone' => '0901234567'],
        'Bad-Key' => 1,
    ], $user);

    $event = ProductEvent::query()->sole();

    expect($event->name)->toBe('macro_run')
        ->and($event->account_id)->toBe($account->id)
        ->and($event->user_id)->toBe($user->id)
        ->and($event->properties)->toEqualCanonicalizing(['macro_id' => 5, 'ok' => true, 'note' => 'ngắn'])
        ->and(array_keys($event->properties))->toEqualCanonicalizing(['macro_id', 'ok', 'note'])
        ->and($event->occurred_at)->not->toBeNull();
});

it('mặc định ghi người dùng đang đăng nhập', function () {
    $account = Account::factory()->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    productEventRecorder()->record(ProductEventName::ContactsExported, $account);

    expect(ProductEvent::query()->sole()->user_id)->toBe($user->id);
});

it('ghi lỗi không làm hỏng transaction của nghiệp vụ, chỉ để lại log', function () {
    Log::spy();
    $account = Account::factory()->create();

    DB::transaction(function () use ($account) {
        // account không tồn tại: insert vi phạm khoá ngoại.
        productEventRecorder()->record(ProductEventName::MacroRun, 999999);
        Label::factory()->create(['account_id' => $account->id, 'title' => 'vip']);
    });

    expect(Label::query()->where('title', 'vip')->exists())->toBeTrue()
        ->and(ProductEvent::query()->where('name', 'macro_run')->count())->toBe(0)
        ->and(ProductEvent::query()->where('name', 'label_created')->count())->toBe(1);
    Log::shouldHaveReceived('warning')->withArgs(fn (string $message) => $message === 'product_events.record_failed')->once();
});

it('chưa commit thì chưa ghi; transaction lùi thì không để lại sự kiện', function () {
    $account = Account::factory()->create();

    try {
        DB::transaction(function () use ($account) {
            productEventRecorder()->record(ProductEventName::MacroRun, $account);
            expect(ProductEvent::query()->count())->toBe(0);

            throw new RuntimeException('lùi');
        });
    } catch (RuntimeException) {
    }

    expect(ProductEvent::query()->count())->toBe(0);
});

it('sự kiện một lần chỉ ghi lần đầu, mất cache vẫn không trùng nhờ khoá trong DB', function () {
    $account = Account::factory()->create();

    productEventRecorder()->recordOnce(ProductEventName::FirstInboundMessage, $account, "first_inbound_message:{$account->id}", ['inbox_id' => 1]);
    productEventRecorder()->recordOnce(ProductEventName::FirstInboundMessage, $account, "first_inbound_message:{$account->id}", ['inbox_id' => 2]);
    Cache::flush();
    productEventRecorder()->recordOnce(ProductEventName::FirstInboundMessage, $account, "first_inbound_message:{$account->id}", ['inbox_id' => 3]);

    expect(ProductEvent::query()->where('name', 'first_inbound_message')->pluck('properties')->all())->toBe([['inbox_id' => 1]]);
});

it('thuộc tính dạng closure chỉ chạy khi thật sự ghi', function () {
    $account = Account::factory()->create();
    $calls = 0;
    $properties = function () use (&$calls) {
        $calls++;

        return ['inbox_id' => 9];
    };

    productEventRecorder()->recordOnce(ProductEventName::FirstOutboundReply, $account, 'once-key', $properties);
    productEventRecorder()->recordOnce(ProductEventName::FirstOutboundReply, $account, 'once-key', $properties);

    expect($calls)->toBe(1);
});

it('phiên đăng nhập hộ: bỏ lượt dùng tính năng và trả lời khách, vẫn ghi mốc kích hoạt', function () {
    $account = Account::factory()->create();
    productEventRequest('/app/accounts/1/dashboard', [ProductEventRecorder::IMPERSONATION_SESSION_KEY => true]);

    productEventRecorder()->record(ProductEventName::LabelCreated, $account);
    productEventRecorder()->recordOnce(ProductEventName::FirstOutboundReply, $account, 'reply-key');
    productEventRecorder()->record(ProductEventName::InboxCreated, $account);

    expect(ProductEvent::query()->pluck('name')->all())->toBe(['inbox_created']);

    // Lượt bị bỏ không giữ chỗ trong cache: lần trả lời thật sau đó vẫn được ghi.
    productEventRequest('/app/accounts/1/dashboard');
    productEventRecorder()->recordOnce(ProductEventName::FirstOutboundReply, $account, 'reply-key');
    expect(ProductEvent::query()->where('name', 'first_outbound_reply')->count())->toBe(1);
});

it('thao tác trong console /admin không tính là tenant dùng tính năng', function () {
    $account = Account::factory()->create();
    productEventRequest('/admin/api/accounts/1/sticker_packs');

    productEventRecorder()->record(ProductEventName::StickerUploaded, $account);

    expect(ProductEvent::query()->count())->toBe(0);
});

it('đăng nhập bằng link đăng nhập hộ đánh dấu phiên; tạo nhãn trong phiên đó không ghi sự kiện', function () {
    $account = Account::factory()->create();
    $target = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $target->id]);
    $token = $target->generateSsoAuthToken(impersonation: true);
    SuperAdminImpersonation::query()->create([
        'super_admin_id' => User::factory()->create()->id,
        'target_user_id' => $target->id,
        'reason' => 'điều tra sự cố khách báo lỗi',
        'token_hash' => hash('sha256', $token),
    ]);

    $this->post('/app/login', ['email' => $target->email, 'sso_auth_token' => $token])
        ->assertSessionHas(ProductEventRecorder::IMPERSONATION_SESSION_KEY, true);

    $this->actingAs($target)
        ->withSession([ProductEventRecorder::IMPERSONATION_SESSION_KEY => true])
        ->postJson("/api/v1/accounts/{$account->id}/labels", ['title' => 'giao-gap'])
        ->assertOk();

    expect(Label::query()->where('title', 'giao-gap')->exists())->toBeTrue()
        ->and(ProductEvent::query()->where('name', 'label_created')->count())->toBe(0);
});

it('đăng nhập thường không đánh dấu phiên', function () {
    $user = User::factory()->create(['password' => 'Password1!']);

    $this->post('/app/login', ['email' => $user->email, 'password' => 'Password1!'])
        ->assertSessionMissing(ProductEventRecorder::IMPERSONATION_SESSION_KEY);
});
