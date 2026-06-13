<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
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
    }
}
