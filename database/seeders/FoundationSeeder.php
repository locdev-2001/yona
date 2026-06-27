<?php

namespace Database\Seeders;

use App\Enums\PlatformRole;
use App\Models\Admin;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use App\Services\LookupService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;

/**
 * Dev convenience: ensure a default workspace exists and every existing user is
 * an admin member of it, so a logged-in account has a workspace context.
 * Idempotent. Not run for tests (which build their own workspaces).
 */
class FoundationSeeder extends Seeder
{
    public function run(): void
    {
        // Dev platform-admin login (guard `admin`) + super_admin role. Idempotent.
        $admin = Admin::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            ['name' => 'Platform Admin', 'password' => Hash::make('12345678')],
        );

        // Admin role assignments live under the reserved platform scope (reuses
        // the spatie pivot + RLS without a real workspace). The workspace block
        // below re-binds the tenant context afterwards.
        DB::statement("select set_config('app.current_workspace', ?, false)", [Admin::PLATFORM_SCOPE]);
        app(PermissionRegistrar::class)->setPermissionsTeamId(Admin::PLATFORM_SCOPE);
        $admin->syncRoles([PlatformRole::SuperAdmin->value]);

        $workspace = Workspace::firstOrCreate(
            ['slug' => 'cho-rach'],
            [
                'name' => 'Chó Rách',
                'base_currency' => 'VND',
                'timezone' => 'Asia/Ho_Chi_Minh',
                'locale' => 'vi',
                'audit_retention' => '1y',
                'status' => 'active',
            ],
        );

        // Establish the workspace context so RLS + audit accept the writes below.
        app()->instance('currentWorkspace', $workspace);
        DB::statement("select set_config('app.current_workspace', ?, false)", [$workspace->id]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);

        User::all()->each(function (User $user) use ($workspace) {
            if ($user->membershipFor($workspace)) {
                return;
            }

            $member = new WorkspaceMember;
            $member->workspace_id = $workspace->id;
            $member->user_id = $user->id;
            $member->role = 'admin';
            $member->status = 'active';
            $member->joined_at = now();
            $member->save();

            $user->assignRole('admin');
        });

        // Seed default lookup data (pipelines, stages, sources, project statuses)
        // for the dev workspace. seedDefaults() is granularly idempotent — it
        // backfills only the lookup types that are still missing.
        app(LookupService::class)->seedDefaults($workspace);

        // P05 — Seed email template catalog (lead_assigned vi+en).
        // Idempotent via firstOrCreate on (workspace_id, slug, language).
        $this->call(EmailTemplateCatalogSeeder::class);
    }
}
