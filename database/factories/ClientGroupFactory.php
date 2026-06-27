<?php

namespace Database\Factories;

use App\Models\ClientGroup;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ClientGroup>
 */
class ClientGroupFactory extends Factory
{
    protected $model = ClientGroup::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'name' => ucwords((string) $name),
            'slug' => Str::slug((string) $name),
        ];
    }
}
