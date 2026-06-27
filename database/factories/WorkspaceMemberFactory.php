<?php

namespace Database\Factories;

use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkspaceMember>
 *
 * Factories run in an unguarded context, so the server-controlled fields
 * (workspace_id, user_id, role, team_id) set here are persisted despite the
 * model being fully guarded (BR-X12).
 */
class WorkspaceMemberFactory extends Factory
{
    protected $model = WorkspaceMember::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Respect an active workspace context (RLS WITH CHECK on insert).
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'user_id' => User::factory(),
            'role' => 'sales_rep',
            'team_id' => null,
            'status' => 'active',
            'joined_at' => now(),
            'lock_version' => 0,
        ];
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => 'admin']);
    }

    public function role(string $role): static
    {
        return $this->state(fn () => ['role' => $role]);
    }

    public function invited(): static
    {
        return $this->state(fn () => ['status' => 'invited', 'invited_at' => now(), 'joined_at' => null]);
    }

    public function deactivated(): static
    {
        return $this->state(fn () => ['status' => 'deactivated']);
    }
}
