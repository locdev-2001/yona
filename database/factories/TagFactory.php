<?php

namespace Database\Factories;

use App\Models\Tag;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Tag>
 */
class TagFactory extends Factory
{
    protected $model = Tag::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'name' => $name,
            'slug' => Str::slug($name),
            'color' => fake()->optional()->hexColor(),
        ];
    }
}
