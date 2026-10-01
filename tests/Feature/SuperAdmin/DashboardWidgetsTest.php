<?php

use App\Models\Account;
use App\Models\Message;
use App\Models\SuperAdmin;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\WidgetRegistry;
use App\Services\ProductEvents\ProductEventName;
use App\Services\ProductEvents\ProductEventRecorder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

// Trang Tổng quan: danh mục ô + API số liệu từng ô.
beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01 10:00:00', DateRange::TIMEZONE));
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
    $this->actingAs($this->superAdmin, 'super_admin');
    // Dựng dữ liệu mẫu dưới guard mặc định: listener realtime coi người đang đăng nhập là agent.
    Auth::shouldUse('web');
});

$serverWidgets = [
    'kpis', 'messages_trend', 'conversations_by_channel', 'activation_funnel', 'signups_trend',
    'cohort_retention', 'channel_health', 'top_accounts', 'recent_signups', 'queue_health', 'stickers', 'system',
];

it('trang Tổng quan giao danh mục ô, bố cục mặc định và lối tắt vận hành', function () {
    $this->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superadmin/Dashboard', false)
            ->where('widgets.0.key', 'kpis')
            ->where('widgets.0.source', 'server')
            ->where('layout.0', ['key' => 'kpis', 'size' => 'full'])
            ->where('sizes', ['sm', 'md', 'lg', 'full'])
            ->where('ranges', ['7d', '30d', '90d'])
            ->where('defaultRange', '30d')
            ->where('endpoints.widgets', '/admin/api/dashboard/widgets')
            ->where('links', fn ($links) => collect($links)->pluck('url')->all() === ['/horizon', '/pulse', '/logs', 'https://dash.yona.vn'])
            ->where('widgets', fn ($widgets) => collect($widgets)->firstWhere('key', 'operation_links')['source'] === 'client'),
        );
});

it('mỗi ô máy chủ trả số liệu qua JSON', function (string $key) {
    Message::factory()->outgoing()->create();

    $this->getJson("/admin/api/dashboard/widgets/{$key}?range=7d")
        ->assertOk()
        ->assertJsonPath('key', $key)
        ->assertJsonPath('range', ['from' => '2026-09-25', 'to' => '2026-10-01', 'days' => 7])
        ->assertJsonStructure(['data']);
})->with($serverWidgets);

it('trả 404 cho ô lạ hoặc ô do trình duyệt tự lấy dữ liệu', function (string $key) {
    $this->getJson("/admin/api/dashboard/widgets/{$key}")->assertNotFound();
})->with(['khong_co', 'operation_links']);

it('từ chối khoảng ngày không hợp lệ', function (string $query) {
    $this->getJson("/admin/api/dashboard/widgets/kpis?{$query}")->assertUnprocessable();
})->with([
    'preset lạ' => 'range=1y',
    'thiếu ngày cuối' => 'from=2026-09-01',
    'ngày cuối trước ngày đầu' => 'from=2026-09-10&to=2026-09-01',
    'quá dài' => 'from=2024-01-01&to=2026-01-01',
]);

it('nhận khoảng ngày tuỳ chọn', function () {
    $this->getJson('/admin/api/dashboard/widgets/signups_trend?from=2026-09-01&to=2026-09-03')
        ->assertOk()
        ->assertJsonPath('range.days', 3)
        ->assertJsonCount(3, 'data.days');
});

it('khách chưa đăng nhập không gọi được API ô', function () {
    auth('super_admin')->logout();

    $this->getJson('/admin/api/dashboard/widgets/kpis')->assertUnauthorized();
});

it('chỉ số chính so với kỳ trước cùng độ dài', function () {
    $now = CarbonImmutable::now();
    $account = Account::factory()->create(['created_at' => $now->subDays(2)]);
    Account::factory()->create(['created_at' => $now->subDays(10)]);
    Message::factory()->count(2)->create(['account_id' => $account->id, 'created_at' => $now->subDay()]);
    Message::factory()->outgoing()->create(['account_id' => $account->id, 'created_at' => $now->subDay()]);
    Message::factory()->outgoing()->create(['account_id' => $account->id, 'created_at' => $now->subDays(9)]);
    Message::factory()->outgoing()->create(['account_id' => $account->id, 'private' => true, 'created_at' => $now->subDay()]);

    $metrics = collect($this->getJson('/admin/api/dashboard/widgets/kpis?range=7d')->assertOk()->json('data.metrics'))->keyBy('key');

    expect($metrics['accounts_new'])->toMatchArray(['value' => 1, 'previous' => 1, 'changePercent' => 0.0])
        ->and($metrics['messages_incoming']['value'])->toBe(2)
        ->and($metrics['messages_outgoing'])->toMatchArray(['value' => 1, 'previous' => 1])
        ->and($metrics['accounts_active']['value'])->toBe(1);
});

it('phễu kích hoạt thu hẹp dần theo bước', function () {
    $account = Account::factory()->create(['created_at' => now()->subDay()]);
    $other = Account::factory()->create(['created_at' => now()->subDay()]);
    // Bước xác nhận email đọc từ sự kiện sản phẩm.
    foreach ([$account, $other] as $confirmed) {
        app(ProductEventRecorder::class)->record(ProductEventName::EmailConfirmed, $confirmed);
    }
    Message::factory()->create(['account_id' => $account->id]);

    $steps = collect($this->getJson('/admin/api/dashboard/widgets/activation_funnel?range=7d')->json('data.steps'))->keyBy('key');

    expect($steps['signed_up']['count'])->toBe(2)
        ->and($steps['confirmed_email']['count'])->toBe(2)
        ->and($steps['created_inbox']['count'])->toBe(1)
        ->and($steps['created_inbox']['rateFromStart'])->toEqual(50)
        ->and($steps['replied']['count'])->toBe(0);
});

it('giữ chân theo tuần đăng ký đếm account còn trả lời khách', function () {
    $twoWeeksAgo = CarbonImmutable::now()->subWeeks(2);
    $retained = Account::factory()->create(['created_at' => $twoWeeksAgo]);
    Account::factory()->create(['created_at' => $twoWeeksAgo]);
    Message::factory()->outgoing()->create(['account_id' => $retained->id, 'created_at' => $twoWeeksAgo]);
    Message::factory()->outgoing()->create(['account_id' => $retained->id, 'created_at' => CarbonImmutable::now()]);
    Message::factory()->create(['account_id' => $retained->id, 'created_at' => $twoWeeksAgo->addWeek()]);

    $data = $this->getJson('/admin/api/dashboard/widgets/cohort_retention')->assertOk()->json('data');
    $cohort = collect($data['cohorts'])->firstWhere('week', $twoWeeksAgo->startOfWeek()->format('Y-m-d'));

    expect($data['cohorts'])->toHaveCount(8)
        ->and($cohort['size'])->toBe(2)
        ->and($cohort['retention'])->toHaveCount(3)
        ->and($cohort['retention'][0])->toBe(['offset' => 0, 'active' => 1, 'rate' => 50])
        ->and($cohort['retention'][1]['active'])->toBe(0)
        ->and($cohort['retention'][2]['active'])->toBe(1)
        ->and(end($data['cohorts'])['retention'])->toHaveCount(1);
});

it('sức khoẻ kênh đếm hộp thư khoẻ và hỏng', function () {
    Message::factory()->create();

    $this->getJson('/admin/api/dashboard/widgets/channel_health')
        ->assertOk()
        ->assertJsonPath('data.total', 1)
        ->assertJsonPath('data.healthy', 1)
        ->assertJsonPath('data.failing', 0)
        ->assertJsonPath('data.url', '/admin/channel_health');
});

it('làm mới bỏ qua cache máy chủ', function () {
    Cache::flush();
    $this->getJson('/admin/api/dashboard/widgets/signups_trend?range=7d')->assertOk();
    Account::factory()->create();

    $total = fn (string $query) => collect($this->getJson("/admin/api/dashboard/widgets/signups_trend?{$query}")->json('data.days'))->sum('count');

    expect($total('range=7d'))->toBe(0)
        ->and($total('range=7d&fresh=1'))->toBe(1);
});

it('danh mục ô có đủ nhãn ở mọi ngôn ngữ', function () {
    foreach (['vi', 'en'] as $locale) {
        foreach (app(WidgetRegistry::class)->keys() as $key) {
            $langKey = 'admin_dashboard.WIDGETS.'.strtoupper($key).'.TITLE';
            expect(trans($langKey, [], $locale))->not->toBe($langKey);
        }
    }
});
