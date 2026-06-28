<?php

use App\Modules\Integration\Contracts\PaymentDriver;
use App\Modules\Integration\PaymentManager;
use App\Modules\Integration\Payment\Manual\ManualPaymentDriver;
use Modules\Billing\Models\MarketplaceItem;
use Modules\Billing\Models\WorkspacePurchase;
use Modules\Billing\Services\EntitlementResolver;
use Modules\Billing\Services\GrantPlanService;
use Modules\Tenancy\Models\Workspace;

// ── Driver registry ───────────────────────────────────────────────────────────

it('PaymentManager: driver(manual) instanceof ManualPaymentDriver', function () {
    $manager = app(PaymentManager::class);

    expect($manager->driver('manual'))->toBeInstanceOf(ManualPaymentDriver::class);
});

it('ManualPaymentDriver implements PaymentDriver contract', function () {
    $provider = app(ManualPaymentDriver::class);

    expect($provider)->toBeInstanceOf(PaymentDriver::class)
        ->and($provider->key())->toBe('manual');
});

// ── 0 sửa lõi: thêm driver KHÔNG sửa PaymentManager/PaymentProvider ─────────

it('PaymentManager still has only its original methods (no core edit)', function () {
    $manager = app(PaymentManager::class);

    // Chỉ kiểm phương thức public của lõi vẫn tồn tại đúng
    expect(method_exists($manager, 'extend'))->toBeTrue()
        ->and(method_exists($manager, 'driver'))->toBeTrue()
        ->and(method_exists($manager, 'availableDrivers'))->toBeTrue();
});

// ── GrantPlanService: grant ───────────────────────────────────────────────────

it('GrantPlanService::grant tạo workspace_purchase active', function () {
    $workspace = Workspace::factory()->create();

    $teamItem = MarketplaceItem::where('code', 'plan.team')->firstOrCreate(
        ['code' => 'plan.team'],
        [
            'name' => 'Team',
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 500_000,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => [
                'flags' => ['module.inbox', 'integration.zalo_personal'],
                'quotas' => ['quota.conversations.zalo_personal' => 1000, 'quota.seats' => 10],
            ],
        ]
    );

    $service = app(GrantPlanService::class);
    $purchase = $service->grant($workspace->id, 'plan.team');

    expect($purchase->status)->toBe('active')
        ->and($purchase->workspace_id)->toBe($workspace->id)
        ->and($purchase->item_id)->toBe($teamItem->id);
});

it('GrantPlanService::grant: EntitlementResolver entitlements đổi LIVE sau grant', function () {
    $workspace = Workspace::factory()->create();
    // Cần set workspace context để EntitlementResolver query qua RLS
    actingInWorkspace($workspace);

    $teamItem = MarketplaceItem::where('code', 'plan.team')->first()
        ?? MarketplaceItem::create([
            'code' => 'plan.team',
            'name' => 'Team',
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 500_000,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => [
                'flags' => ['module.inbox', 'integration.zalo_personal'],
                'quotas' => ['quota.conversations.zalo_personal' => 1000, 'quota.seats' => 10],
            ],
        ]);

    $resolver = app(EntitlementResolver::class);
    $resolver->forgetCache($workspace->id);

    // Trước grant: workspace mới tạo không có plan.team (auto-grant plan.free chạy khi create)
    // plan.free không có integration.zalo_personal
    expect($resolver->allows($workspace->id, 'integration.zalo_personal'))->toBeFalse();

    app(GrantPlanService::class)->grant($workspace->id, 'plan.team');

    // Sau grant: cache bị forget → resolver đọc lại từ DB → entitlements phản ánh team plan
    expect($resolver->allows($workspace->id, 'integration.zalo_personal'))->toBeTrue()
        ->and($resolver->limit($workspace->id, 'quota.conversations.zalo_personal'))->toBe(1000);
});

it('GrantPlanService::grant idempotent: gọi 2 lần → 1 active purchase, không nhân đôi', function () {
    $workspace = Workspace::factory()->create();

    MarketplaceItem::where('code', 'plan.team')->firstOrCreate(
        ['code' => 'plan.team'],
        [
            'name' => 'Team',
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 500_000,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => [
                'flags' => ['module.inbox', 'integration.zalo_personal'],
                'quotas' => ['quota.conversations.zalo_personal' => 1000, 'quota.seats' => 10],
            ],
        ]
    );

    $service = app(GrantPlanService::class);
    $service->grant($workspace->id, 'plan.team');
    $service->grant($workspace->id, 'plan.team'); // gọi lần 2

    // Đọc qua pgsql_privileged để bypass RLS (không có workspace context trong test này)
    $teamItem = MarketplaceItem::where('code', 'plan.team')->firstOrFail();
    $count = \Illuminate\Support\Facades\DB::connection('pgsql_privileged')
        ->table('workspace_purchases')
        ->where('workspace_id', $workspace->id)
        ->where('item_id', $teamItem->id)
        ->where('status', 'active')
        ->count();

    expect($count)->toBe(1);
});

it('GrantPlanService::revoke: cancelled → entitlements về free', function () {
    $workspace = Workspace::factory()->create();
    // Set context để resolver query qua RLS
    actingInWorkspace($workspace);

    $teamItem = MarketplaceItem::where('code', 'plan.team')->firstOrCreate(
        ['code' => 'plan.team'],
        [
            'name' => 'Team',
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 500_000,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => [
                'flags' => ['module.inbox', 'integration.zalo_personal'],
                'quotas' => ['quota.conversations.zalo_personal' => 1000, 'quota.seats' => 10],
            ],
        ]
    );

    $service = app(GrantPlanService::class);
    $resolver = app(EntitlementResolver::class);

    // Grant trước
    $service->grant($workspace->id, 'plan.team');
    expect($resolver->allows($workspace->id, 'integration.zalo_personal'))->toBeTrue();

    // Revoke
    $service->revoke($workspace->id, 'plan.team');

    // Entitlements về free (không có integration.zalo_personal trong free defaults)
    expect($resolver->allows($workspace->id, 'integration.zalo_personal'))->toBeFalse();

    // DB: purchase cancelled (đọc qua pgsql_privileged để bypass RLS)
    $row = \Illuminate\Support\Facades\DB::connection('pgsql_privileged')
        ->table('workspace_purchases')
        ->where('workspace_id', $workspace->id)
        ->where('item_id', $teamItem->id)
        ->first();

    expect($row->status)->toBe('cancelled');
});
