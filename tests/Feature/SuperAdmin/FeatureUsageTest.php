<?php

use App\Models\Account;
use App\Models\ProductEvent;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Admin\Metrics\DateRange;
use App\Services\ProductEvents\ProductEventName;
use App\Services\ProductEvents\ProductEventRecorder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;

// Trang Mức dùng tính năng, danh sách account theo tính năng, khối "Tính năng đã
// dùng" + câu sự kiện ở Account 360, phễu kích hoạt đọc từ sự kiện.

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01 10:00:00', DateRange::TIMEZONE));
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
    $this->shop = Account::factory()->create(['name' => 'Shop Mẹ Bé']);
    $this->store = Account::factory()->create(['name' => 'Cửa hàng Minh']);
    ProductEvent::query()->delete();

    $record = fn (ProductEventName $name, Account $account, int $daysAgo, array $properties = []) => app(ProductEventRecorder::class)
        ->record($name, $account, $properties, occurredAt: now()->subDays($daysAgo));

    $record(ProductEventName::StickerSent, $this->shop, 1);
    $record(ProductEventName::StickerSent, $this->shop, 2);
    $record(ProductEventName::StickerSent, $this->store, 45);
    $record(ProductEventName::MacroRun, $this->store, 120);
    $record(ProductEventName::ChannelConnected, $this->shop, 3, ['platform' => 'zalo', 'method' => 'qr', 'inbox_id' => 1]);
});

it('bắt buộc đăng nhập super admin', function () {
    $this->get('/admin/feature_usage')->assertRedirect('/admin/sign_in');
    $this->actingAs(User::factory()->create())->get('/admin/feature_usage')->assertRedirect('/admin/sign_in');
});

it('mỗi tính năng: số account 7/30/90 ngày và tất cả, tổng lượt, lần gần nhất, xu hướng 30 ngày', function () {
    $this->actingAs($this->superAdmin, 'super_admin')
        ->get('/admin/feature_usage')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/FeatureUsage', false)
            ->has('features', count(ProductEventName::cases()))
            ->where('windows', ['7d', '30d', '90d'])
            ->where('features', function ($features) {
                $sticker = collect($features)->firstWhere('key', 'sticker_sent');
                $macro = collect($features)->firstWhere('key', 'macro_run');
                $label = collect($features)->firstWhere('key', 'label_created');

                return $sticker['accounts'] === ['7d' => 1, '30d' => 1, '90d' => 2, 'all' => 2]
                    && $sticker['events'] === 3
                    && $sticker['group'] === 'feature'
                    && $sticker['label'] === 'Sticker sent'
                    && $sticker['url'] === '/admin/feature_usage/sticker_sent'
                    && count($sticker['trend']) === 30
                    && array_sum($sticker['trend']) === 2
                    && $sticker['trend'][28] === 1 && $sticker['trend'][29] === 0
                    && str_starts_with((string) $sticker['lastAt'], '2026-09-30')
                    && $macro['accounts'] === ['7d' => 0, '30d' => 0, '90d' => 0, 'all' => 1]
                    && $label['events'] === 0 && $label['lastAt'] === null
                    && collect($features)->firstWhere('key', 'channel_connected')['group'] === 'activation';
            }),
        );
});

it('bấm một tính năng ra danh sách account dùng nó, dùng gần nhất trước', function () {
    $this->actingAs($this->superAdmin, 'super_admin')
        ->get('/admin/feature_usage/sticker_sent')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/FeatureUsageAccounts', false)
            ->where('feature.key', 'sticker_sent')
            ->where('backUrl', '/admin/feature_usage')
            ->has('accounts', 2)
            ->where('accounts.0.accountName', 'Shop Mẹ Bé')
            ->where('accounts.0.events', 2)
            ->where('accounts.0.events30d', 2)
            ->where('accounts.0.url', "/admin/accounts/{$this->shop->id}/overview")
            ->where('accounts.1.accountName', 'Cửa hàng Minh')
            ->where('accounts.1.events30d', 0),
        );
});

it('tên tính năng lạ trả 404', function () {
    $this->actingAs($this->superAdmin, 'super_admin')->get('/admin/feature_usage/khong_co')->assertNotFound();
});

it('Account 360 có danh sách tính năng đã dùng và câu sự kiện trong dòng thời gian', function () {
    $this->actingAs($this->superAdmin, 'super_admin')
        ->get("/admin/accounts/{$this->shop->id}/overview")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/AccountOverview', false)
            ->where('features', [[
                'key' => 'sticker_sent',
                'label' => 'Sticker sent',
                'group' => 'feature',
                'events' => 2,
                'lastAt' => now()->subDay()->utc()->toIso8601String(),
            ]])
            ->where('urls.featureUsage', '/admin/feature_usage')
            ->where('timeline', function ($timeline) {
                $titles = collect($timeline)->pluck('title');

                return $titles->contains('Connected Zalo: QR scan')
                    && $titles->filter(fn ($title) => $title === 'Sent a sticker')->count() === 2
                    && collect($timeline)->firstWhere('type', 'product.channel_connected') !== null;
            }),
        );
});

it('dòng thời gian gộp lượt dùng cùng tính năng trong một ngày', function () {
    app(ProductEventRecorder::class)->record(ProductEventName::StickerSent, $this->shop, [], occurredAt: now()->subDay()->addMinute());

    $this->actingAs($this->superAdmin, 'super_admin')
        ->get("/admin/accounts/{$this->shop->id}/overview")
        ->assertInertia(fn ($page) => $page->where('timeline', fn ($timeline) => collect($timeline)
            ->where('type', 'product.sticker_sent')
            ->pluck('detail')
            ->sort()
            ->values()
            ->all() === [null, '2 times']));
});

it('phễu kích hoạt: bước xác nhận email và kết nối kênh đọc từ sự kiện', function () {
    $cohort = Account::factory()->count(3)->create(['created_at' => now()->subDay()]);
    app(ProductEventRecorder::class)->record(ProductEventName::EmailConfirmed, $cohort[0]);
    app(ProductEventRecorder::class)->record(ProductEventName::EmailConfirmed, $cohort[1]);
    // Có sự kiện kết nối nhưng chưa xác nhận email: phễu không tính vì bước trước chưa qua.
    app(ProductEventRecorder::class)->record(ProductEventName::ChannelConnected, $cohort[2]);
    Auth::shouldUse('web');

    $steps = collect($this->actingAs($this->superAdmin, 'super_admin')
        ->getJson('/admin/api/dashboard/widgets/activation_funnel?range=7d')
        ->assertOk()
        ->json('data.steps'))->keyBy('key');

    expect($steps->keys()->all())->toBe(['signed_up', 'confirmed_email', 'created_inbox', 'connected_channel', 'received_message', 'replied'])
        ->and($steps['confirmed_email']['count'])->toBe(2)
        ->and($steps['created_inbox']['count'])->toBe(0)
        ->and($steps['connected_channel']['count'])->toBe(0);
});
