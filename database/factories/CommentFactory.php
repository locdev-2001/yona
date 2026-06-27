<?php

namespace Database\Factories;

use App\Models\Comment;
use Modules\Identity\Models\Team;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Comment>
 */
class CommentFactory extends Factory
{
    protected $model = Comment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'commentable_type' => 'team',
            'commentable_id' => Team::factory(),
            'parent_id' => null,
            'user_id' => null,
            'contact_id' => null,
            'body' => fake()->paragraph(),
            'visible_to_customer' => false,
        ];
    }

    public function reply(Comment $parent): static
    {
        return $this->state(fn () => [
            'parent_id' => $parent->id,
            'commentable_type' => $parent->commentable_type,
            'commentable_id' => $parent->commentable_id,
        ]);
    }

    public function visibleToCustomer(): static
    {
        return $this->state(fn () => ['visible_to_customer' => true]);
    }
}
