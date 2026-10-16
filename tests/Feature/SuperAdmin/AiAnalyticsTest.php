<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AiAgent;
use App\Models\AiUsageAnalytic;
use App\Models\ApiLog;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\AiAgents\AiAgentService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\App;

// Super Admin › Phân tích AI: chỉ admin Yona xem được, số liệu chỉ đọc ai_usage_analytics.

/** @param  array<string, int>  $counters */
function usageAt(AiAgent $aiAgent, string $at, array $counters): void
{
    AiUsageAnalytic::accumulate($aiAgent->account_id, $aiAgent->id, $counters, Carbon::parse($at, 'UTC'));
}

function analyticsProps(string $query = ''): array
{
    return test()->get('/admin/ai_analytics'.($query === '' ? '' : "?{$query}"))->assertOk()->viewData('page')['props'];
}

describe('quyền xem', function () {
    it('tài khoản doanh nghiệp (kể cả quản trị viên account) không vào được', function () {
        $account = Account::factory()->create();
        $owner = User::factory()->create();
        AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $owner->id]);

        $this->actingAs($owner)->get('/admin/ai_analytics')->assertRedirect('/admin/sign_in');
        $this->actingAs($owner)->getJson('/admin/ai_analytics')->assertUnauthorized();
    });

    it('chưa đăng nhập thì về trang đăng nhập console', function () {
        $this->get('/admin/ai_analytics')->assertRedirect('/admin/sign_in');
    });

    it('super admin thấy trang và mục Phân tích AI trên thanh bên, không còn Nhật ký AI', function () {
        App::setLocale('vi');
        $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');

        $this->get('/admin/ai_analytics')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('superadmin/AiAnalytics', false)
                ->where('superAdmin.navGroups', fn ($groups) => collect($groups)
                    ->flatMap(fn ($group) => $group['items'])
                    ->contains(fn ($item) => $item['url'] === '/admin/ai_analytics' && $item['label'] === 'Phân tích AI')));

        $this->get('/admin/ai_logs')->assertNotFound();
    });
});

describe('số liệu', function () {
    beforeEach(function () {
        $this->actingAs(SuperAdmin::factory()->withMfa()->create(), 'super_admin');
        Carbon::setTestNow('2026-10-16 05:20:00');
        $service = app(AiAgentService::class);
        $this->shop = Account::factory()->create(['name' => 'Shop Áo Đẹp']);
        $this->other = Account::factory()->create(['name' => 'Tiệm Bánh Mây']);
        $this->lan = $service->create($this->shop, 'Lan', null, null);
        $this->mai = $service->create($this->shop, 'Mai', null, null);
        $this->hoa = $service->create($this->other, 'Hoa', null, null);
    });

    it('cộng kỳ này và kỳ trước của 24 giờ theo giờ UTC, xếp chi phí theo từng giờ', function () {
        usageAt($this->lan, '2026-10-16 05:10:00', ['turns' => 2, 'replies' => 1, 'handoffs' => 1, 'model_calls' => 3, 'cost_micro_usd' => 3000, 'latency_ms_total' => 3600]);
        usageAt($this->lan, '2026-10-15 06:00:00', ['turns' => 1, 'failed_turns' => 1, 'model_calls' => 1, 'cost_micro_usd' => 500]);
        usageAt($this->lan, '2026-10-15 05:59:59', ['turns' => 4, 'cost_micro_usd' => 9000]);
        usageAt($this->lan, '2026-10-14 05:30:00', ['turns' => 9, 'cost_micro_usd' => 9]);

        $props = analyticsProps('range=24h');

        expect($props['window']['bucket'])->toBe('hour')
            ->and($props['totals'])->toMatchArray(['turns' => 3, 'replies' => 1, 'handoffs' => 1, 'failed_turns' => 1, 'model_calls' => 4, 'cost_micro_usd' => 3500, 'ai_agents' => 1])
            ->and($props['previousTotals'])->toMatchArray(['turns' => 4, 'cost_micro_usd' => 9000])
            ->and($props['hourlyCost'])->toHaveCount(24)
            ->and($props['hourlyCost'][0])->toBe(['at' => '2026-10-15T06:00:00Z', 'cost' => 500, 'previousCost' => 0])
            ->and($props['hourlyCost'][23])->toBe(['at' => '2026-10-16T05:00:00Z', 'cost' => 3000, 'previousCost' => 9000])
            ->and(collect($props['hourlyCost'])->sum('previousCost'))->toBe(9000);
    });

    it('chia cột theo ngày giờ Việt Nam khi xem 7 ngày', function () {
        // 23:30 ngày 15/10 theo UTC là 06:30 ngày 16/10 theo giờ Việt Nam.
        usageAt($this->lan, '2026-10-15 23:30:00', ['turns' => 1, 'replies' => 1]);
        usageAt($this->lan, '2026-10-15 16:30:00', ['turns' => 1, 'failed_turns' => 1]);

        $props = analyticsProps('range=7d');
        $byDay = collect($props['buckets'])->keyBy('key');

        expect($props['window'])->toMatchArray(['preset' => '7d', 'from' => '2026-10-10', 'to' => '2026-10-16', 'bucket' => 'day'])
            ->and($props['buckets'])->toHaveCount(7)
            ->and($byDay['2026-10-16']['replies'])->toBe(1)
            ->and($byDay['2026-10-15']['failed_turns'])->toBe(1)
            ->and($props['hourlyCost'])->toHaveCount(7 * 24);
    });

    it('lọc theo account và theo nhân viên AI, kể cả nhân viên AI đã xoá', function () {
        usageAt($this->lan, '2026-10-16 04:00:00', ['turns' => 2, 'cost_micro_usd' => 200]);
        usageAt($this->mai, '2026-10-16 04:00:00', ['turns' => 3, 'cost_micro_usd' => 300]);
        usageAt($this->hoa, '2026-10-16 04:00:00', ['turns' => 5, 'cost_micro_usd' => 600]);
        app(AiAgentService::class)->delete($this->mai);

        $all = analyticsProps('range=24h');
        $shop = analyticsProps("range=24h&account_id={$this->shop->id}");
        $mai = analyticsProps("range=24h&account_id={$this->shop->id}&ai_agent_id={$this->mai->id}");

        expect($all['totals']['turns'])->toBe(10)
            ->and(collect($all['accounts'])->map(fn ($row) => [$row['name'], $row['aiAgents'], $row['turns']])->all())
            ->toBe([['Tiệm Bánh Mây', 1, 5], ['Shop Áo Đẹp', 2, 5]])
            ->and($shop['totals']['turns'])->toBe(5)
            ->and(collect($shop['accounts'])->pluck('accountId')->all())->toBe([$this->shop->id])
            ->and($shop['options']['aiAgents'])->toBe([
                ['value' => (string) $this->lan->id, 'label' => 'Lan', 'accountId' => $this->shop->id],
                ['value' => (string) $this->mai->id, 'label' => null, 'accountId' => $this->shop->id],
            ])
            ->and($mai['totals'])->toMatchArray(['turns' => 3, 'cost_micro_usd' => 300])
            ->and(collect($all['options']['accounts'])->pluck('label')->all())->toBe(['Shop Áo Đẹp', 'Tiệm Bánh Mây']);
    });

    it('chỉ đọc bảng tổng kết, không đọc api_logs', function () {
        ApiLog::query()->create(['account_id' => $this->shop->id, 'ai_agent_id' => $this->lan->id, 'provider' => 'anthropic', 'model' => 'm', 'request' => [], 'cost_micro_usd' => 999_999]);

        $props = analyticsProps('range=24h');

        expect($props['totals']['cost_micro_usd'])->toBe(0)
            ->and($props['accounts'])->toBe([]);
    });

    it('xem khoảng tuỳ chọn, và về 7 ngày khi khoảng không hợp lệ', function () {
        usageAt($this->lan, '2026-10-01 03:00:00', ['turns' => 1]);

        $custom = analyticsProps('range=custom&from=2026-10-01&to=2026-10-01');
        $invalid = analyticsProps('range=custom&from=2026-10-05&to=2026-10-01');

        expect($custom['window'])->toMatchArray(['preset' => 'custom', 'from' => '2026-10-01', 'to' => '2026-10-01', 'bucket' => 'hour'])
            ->and($custom['totals']['turns'])->toBe(1)
            ->and($custom['buckets'])->toHaveCount(24)
            ->and($invalid['window']['preset'])->toBe('7d');
    });
});
