<?php

use App\Enums\TenantPermission;
use App\Events\LeadCreated;
use App\Models\Lead;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowRun;
use App\Models\Workspace;
use App\Services\EntitlementService;
use App\Services\GrantPlanService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

// Phase 05 — Permissions & entitlement gate. Uses the same
// grantMarketingEntitlement() pattern documented in WorkflowTriggersTest.php
// (creates the MarketplaceItem via pgsql_privileged — DatabaseTransactions
// only wraps the default connection, so a row created there is invisible to
// GrantPlanService's own pgsql_privileged INSERT until the outer test
// transaction resolves).

function startTriggerGraph2(string $trigger): array
{
    return [
        'nodes' => [
            ['id' => 'n_start', 'type' => 'start', 'config' => ['trigger' => $trigger]],
            ['id' => 'n_end', 'type' => 'end', 'config' => []],
        ],
        'edges' => [
            ['from' => 'n_start', 'to' => 'n_end', 'branch' => null],
        ],
    ];
}

function grantMarketingEntitlement2(Workspace $ws): void
{
    $privileged = DB::connection('pgsql_privileged');

    $exists = $privileged->table('marketplace_items')->where('code', 'module-marketing')->exists();

    if (! $exists) {
        $privileged->table('marketplace_items')->insert([
            'id' => (string) Str::uuid(),
            'code' => 'module-marketing',
            'name' => 'Marketing module',
            'type' => 'feature_module',
            'billing_type' => 'subscription',
            'price_cents' => 0,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => json_encode(['flags' => ['module.marketing'], 'quotas' => []]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    app(GrantPlanService::class)->grant($ws->id, 'module-marketing');
    app(EntitlementService::class)->forgetCache($ws->id);
}

function revokeMarketingEntitlement2(Workspace $ws): void
{
    DB::connection('pgsql_privileged')->table('workspace_purchases')
        ->where('workspace_id', $ws->id)
        ->update(['status' => 'cancelled']);

    app(EntitlementService::class)->forgetCache($ws->id);
}

it('user without tenant.automation.manage gets 403 on store', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'viewer'); // viewer role has no AutomationManage
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement2($ws); // entitled — isolate the PERMISSION check

    $response = $this->post(route('automation.workflows.store'), [
        'name' => 'Should be forbidden',
        'graph' => startTriggerGraph2('lead_created'),
    ]);

    $response->assertForbidden();
    expect(Workflow::where('name', 'Should be forbidden')->exists())->toBeFalse();
});

it('user without tenant.automation.manage gets 403 on update', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');
    actingInWorkspace($ws, $admin);
    grantMarketingEntitlement2($ws);

    $workflow = Workflow::factory()->create(['graph' => startTriggerGraph2('lead_created')]);

    $viewer = User::factory()->create();
    seedMember($ws, $viewer, 'viewer');
    actingInWorkspace($ws, $viewer);

    $response = $this->put(route('automation.workflows.update', $workflow), [
        'name' => 'Renamed by viewer',
    ]);

    $response->assertForbidden();
    expect($workflow->fresh()->name)->not->toBe('Renamed by viewer');
});

it('workspace without module.marketing gets 403 from EnsureEntitled on store, even for an admin', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin'); // admin has AutomationManage — isolate the ENTITLEMENT check
    actingInWorkspace($ws, $user);
    // No grantMarketingEntitlement2() call — workspace stays on free defaults.

    $response = $this->post(route('automation.workflows.store'), [
        'name' => 'Should be blocked by entitlement',
        'graph' => startTriggerGraph2('lead_created'),
    ]);

    $response->assertForbidden();
    expect(Workflow::where('name', 'Should be blocked by entitlement')->exists())->toBeFalse();
});

it('backfill migration grants tenant.automation.manage to existing admin/sales_manager/support_manager roles', function () {
    // Simulate a workspace provisioned BEFORE this permission existed: strip
    // it from the global admin role definition (roles are global,
    // workspace_id=NULL — assignments are per-workspace, per
    // PlatformPermissionSeeder's own docblock).
    $registrar = app(PermissionRegistrar::class);
    $registrar->setPermissionsTeamId(null);

    $adminRole = Role::where('name', 'admin')->where('guard_name', 'web')->firstOrFail();
    $adminRole->revokePermissionTo(TenantPermission::AutomationManage->value);
    $registrar->forgetCachedPermissions();

    expect($adminRole->fresh()->hasPermissionTo(TenantPermission::AutomationManage->value))->toBeFalse();

    // Re-run the exact backfill migration's up() logic.
    $migration = require base_path('database/migrations/2026_07_04_500005_grant_automation_manage_permission.php');
    $migration->up();

    $registrar->forgetCachedPermissions();
    expect($adminRole->fresh()->hasPermissionTo(TenantPermission::AutomationManage->value))->toBeTrue();
});

it('a workflow that stays is_active=true after its workspace loses module.marketing stops enrolling new runs', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);
    grantMarketingEntitlement2($ws);

    Workflow::factory()->create(['is_active' => true, 'graph' => startTriggerGraph2('lead_created')]);

    $firstLead = Lead::factory()->create();
    DB::transaction(function () use ($firstLead) {
        event(new LeadCreated($firstLead));
    });
    actingInWorkspace($ws, $user);

    expect(WorkflowRun::where('subject_type', 'lead')->where('subject_id', $firstLead->id)->count())->toBe(1);

    // Entitlement lapses (e.g. subscription cancelled) — workflow row itself
    // is untouched, still is_active=true.
    revokeMarketingEntitlement2($ws);
    actingInWorkspace($ws, $user);

    $secondLead = Lead::factory()->numbered(1)->create();
    DB::transaction(function () use ($secondLead) {
        event(new LeadCreated($secondLead));
    });
    actingInWorkspace($ws, $user);

    expect(WorkflowRun::where('subject_type', 'lead')->where('subject_id', $secondLead->id)->count())->toBe(0);
    expect(Workflow::where('is_active', true)->count())->toBe(1); // row untouched
});
