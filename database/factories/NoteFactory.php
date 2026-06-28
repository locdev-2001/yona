<?php

namespace Database\Factories;

use App\Models\Note;
use App\Models\Team;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Note>
 */
class NoteFactory extends Factory
{
    protected $model = Note::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'noteable_type' => 'team',
            'noteable_id' => Team::factory(),
            'user_id' => null,
            'body' => fake()->paragraph(),
            'date_contacted' => fake()->optional()->date(),
        ];
    }

    public function withDateContacted(): static
    {
        return $this->state(fn () => ['date_contacted' => fake()->date()]);
    }
}
