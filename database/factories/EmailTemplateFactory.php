<?php

namespace Database\Factories;

use App\Models\EmailTemplate;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmailTemplate>
 */
class EmailTemplateFactory extends Factory
{
    protected $model = EmailTemplate::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Respect an active workspace context (RLS WITH CHECK on insert).
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'slug' => 'test_'.fake()->unique()->slug(2, false),
            'type' => 'leads',
            'name' => fake()->words(3, true),
            'subject' => 'Hello {assignee_name} — {lead_name}',
            'body' => '<p>Hi {assignee_name},</p><p>Lead <strong>{lead_name}</strong> has been assigned to you.</p>',
            'language' => 'en',
            'plaintext' => false,
            'active' => true,
            'sort_order' => 0,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['active' => false]);
    }

    public function plaintext(): static
    {
        return $this->state(['plaintext' => true]);
    }

    public function vietnamese(): static
    {
        return $this->state(['language' => 'vi']);
    }
}
