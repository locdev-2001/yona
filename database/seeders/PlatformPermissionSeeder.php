<?php

namespace Database\Seeders;

use App\Enums\TenantPermission;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Seeds the GLOBAL (workspace_id = NULL) tenant-plane role definitions + their
 * feature permissions (guard `web`). Role *definitions* are shared across all
 * workspaces; *assignments* are per-workspace (carry workspace_id). The catalog
 * lives in code (TenantPermission enum). Idempotent.
 */
class PlatformPermissionSeeder extends Seeder
{
    private const GUARD = 'web';

    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->setPermissionsTeamId(null);

        foreach (TenantPermission::values() as $permission) {
            Permission::findOrCreate($permission, self::GUARD);
        }

        foreach ($this->roleGrants() as $role => $permissions) {
            Role::findOrCreate($role, self::GUARD)->syncPermissions($permissions);
        }

        // Drop permissions removed from the catalog (e.g. after a prefix rename).
        Permission::where('guard_name', self::GUARD)
            ->whereNotIn('name', TenantPermission::values())
            ->delete();

        $registrar->forgetCachedPermissions();
    }

    /** @return array<string, list<string>> Workspace role → granted permissions (G2). */
    private function roleGrants(): array
    {
        return [
            // admin: all permissions (auto-includes new cases via values())
            'admin' => TenantPermission::values(),

            // sales_manager: full access to leads, clients, contacts, projects, tasks + audit
            'sales_manager' => [
                TenantPermission::TagsManage->value,
                TenantPermission::AuditView->value,
                TenantPermission::ClientView->value,
                TenantPermission::ClientViewOwn->value,
                TenantPermission::ClientCreate->value,
                TenantPermission::ClientUpdate->value,
                TenantPermission::ClientDelete->value,
                TenantPermission::ContactView->value,
                TenantPermission::ContactViewOwn->value,
                TenantPermission::ContactCreate->value,
                TenantPermission::ContactUpdate->value,
                TenantPermission::ContactDelete->value,
                TenantPermission::LeadView->value,
                TenantPermission::LeadViewOwn->value,
                TenantPermission::LeadCreate->value,
                TenantPermission::LeadUpdate->value,
                TenantPermission::LeadDelete->value,
                TenantPermission::ProjectView->value,
                TenantPermission::ProjectViewOwn->value,
                TenantPermission::ProjectCreate->value,
                TenantPermission::ProjectUpdate->value,
                TenantPermission::ProjectDelete->value,
                TenantPermission::TaskView->value,
                TenantPermission::TaskViewOwn->value,
                TenantPermission::TaskCreate->value,
                TenantPermission::TaskUpdate->value,
                TenantPermission::TaskDelete->value,
                TenantPermission::TaskTimesheetUpdate->value,
                TenantPermission::TaskTimesheetDelete->value,
            ],

            // sales_rep: own view + create + update for leads/clients/contacts/tasks; no delete
            'sales_rep' => [
                TenantPermission::TagsManage->value,
                TenantPermission::ClientViewOwn->value,
                TenantPermission::ClientCreate->value,
                TenantPermission::ClientUpdate->value,
                TenantPermission::ContactViewOwn->value,
                TenantPermission::ContactCreate->value,
                TenantPermission::ContactUpdate->value,
                TenantPermission::LeadViewOwn->value,
                TenantPermission::LeadCreate->value,
                TenantPermission::LeadUpdate->value,
                TenantPermission::TaskViewOwn->value,
                TenantPermission::TaskCreate->value,
                TenantPermission::TaskUpdate->value,
                TenantPermission::TaskTimesheetUpdate->value,
            ],

            // support_manager: full projects/tasks + client/contact view + timesheet manage
            'support_manager' => [
                TenantPermission::TagsManage->value,
                TenantPermission::AuditView->value,
                TenantPermission::ClientView->value,
                TenantPermission::ContactView->value,
                TenantPermission::ProjectView->value,
                TenantPermission::ProjectViewOwn->value,
                TenantPermission::ProjectCreate->value,
                TenantPermission::ProjectUpdate->value,
                TenantPermission::ProjectDelete->value,
                TenantPermission::TaskView->value,
                TenantPermission::TaskViewOwn->value,
                TenantPermission::TaskCreate->value,
                TenantPermission::TaskUpdate->value,
                TenantPermission::TaskDelete->value,
                TenantPermission::TaskTimesheetUpdate->value,
                TenantPermission::TaskTimesheetDelete->value,
            ],

            // support_agent: own project view + task create/update + client view + timesheet own
            'support_agent' => [
                TenantPermission::TagsManage->value,
                TenantPermission::ClientView->value,
                TenantPermission::ProjectViewOwn->value,
                TenantPermission::TaskViewOwn->value,
                TenantPermission::TaskCreate->value,
                TenantPermission::TaskUpdate->value,
                TenantPermission::TaskTimesheetUpdate->value,
            ],

            // marketer: leads view/create/update (lead_sources via tenant.lead.view)
            'marketer' => [
                TenantPermission::TagsManage->value,
                TenantPermission::LeadView->value,
                TenantPermission::LeadCreate->value,
                TenantPermission::LeadUpdate->value,
            ],

            // viewer: read-only access across all 5 entities
            'viewer' => [
                TenantPermission::ClientView->value,
                TenantPermission::ContactView->value,
                TenantPermission::LeadView->value,
                TenantPermission::ProjectView->value,
                TenantPermission::TaskView->value,
            ],
        ];
    }
}
