<?php

namespace Database\Factories;

use App\Models\Workspace;
use App\Models\WorkspaceSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

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
