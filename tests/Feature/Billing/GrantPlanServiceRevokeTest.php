<?php

use Illuminate\Support\Facades\DB;
use Modules\Billing\Models\MarketplaceItem;
use Modules\Billing\Services\EntitlementResolver;
use Modules\Billing\Services\GrantPlanService;
use Modules\Tenancy\Models\Workspace;

/**
 * F2-audit: GrantPlanService::revoke đọc qua pgsql_privileged (không bị RLS silently filter).
 *
 * Regression: revoke cũ dùng Eloquent model qua connection 'pgsql' (RLS-scoped).
 * Admin route không bind workspace context → RLS lọc hết → first() = null → silent no-op.
 * Fix: đọc qua pgsql_privileged giống grant().
 */

// Helper để đảm bảo plan.team tồn tại
function ensureTeamItem(): MarketplaceItem
{
    return MarketplaceItem::where('code', 'plan.team')->first()
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
}

// ── F2-audit: revoke không bị RLS chặn khi không có workspace context ──────────

it('F2-audit: revoke cancels purchase WITHOUT workspace context (admin plane — no RLS bind)', function () {
    $workspace = Workspace::factory()->create();
    $item = ensureTeamItem();

    // Grant qua privileged (như production admin grant)
    $service = app(GrantPlanService::class);
    $service->grant($workspace->id, 'plan.team');

    // Verify purchase active qua privileged
    $before = DB::connection('pgsql_privileged')
        ->table('workspace_purchases')
        ->where('workspace_id', $workspace->id)
        ->where('item_id', $item->id)
        ->where('status', 'active')
        ->first();
    expect($before)->not->toBeNull(); // grant xong phải có

    // KHÔNG bind workspace context (mô phỏng admin route không setWorkspaceContext)
    // clearWorkspaceContext() đã chạy trong TestCase::setUp() → không cần gọi thêm

    // Revoke — phải thành công dù không có workspace context
    $result = $service->revoke($workspace->id, 'plan.team');

    expect($result)->not->toBeNull()
        ->and($result->status)->toBe('cancelled');

    // Verify DB thực sự bị cancelled
    $after = DB::connection('pgsql_privileged')
        ->table('workspace_purchases')
        ->where('workspace_id', $workspace->id)
        ->where('item_id', $item->id)
        ->first();
    expect($after)->not->toBeNull()
        ->and($after->status)->toBe('cancelled');
});

it('F2-audit: revoke cập nhật entitlements về free sau khi cancel', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace); // chỉ bind để resolver query được

    $service = app(GrantPlanService::class);
    $resolver = app(EntitlementResolver::class);

    $service->grant($workspace->id, 'plan.team');
    expect($resolver->allows($workspace->id, 'integration.zalo_personal'))->toBeTrue();

    // Revoke không cần workspace context (admin plane)
    clearWorkspaceContext();
    $service->revoke($workspace->id, 'plan.team');

    // Sau revoke, entitlements trở về free defaults
    actingInWorkspace($workspace);
    expect($resolver->allows($workspace->id, 'integration.zalo_personal'))->toBeFalse();
});

it('F2-audit: revoke idempotent — gọi 2 lần không throw', function () {
    $workspace = Workspace::factory()->create();
    $service = app(GrantPlanService::class);

    $service->grant($workspace->id, 'plan.team');
    $service->revoke($workspace->id, 'plan.team');

    // Lần 2 — không có active purchase → return null, không throw
    $result = $service->revoke($workspace->id, 'plan.team');
    expect($result)->toBeNull();
});
