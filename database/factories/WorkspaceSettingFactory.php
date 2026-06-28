<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Workspace;
use App\Models\WorkspaceSetting;

/**
 * @extends Factory<WorkspaceSetting>
 */
class WorkspaceSettingFactory extends Factory
{
    protected $model = WorkspaceSetting::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'key' => fake()->unique()->slug(2),
            'value' => [],
        ];
    }
}
