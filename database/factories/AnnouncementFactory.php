<?php

namespace Database\Factories;

use App\Enums\AnnouncementCategory;
use App\Enums\AnnouncementStatus;
use App\Models\Admin;
use App\Models\Announcement;
use App\Support\AnnouncementMarkdown;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Announcement>
 *
 * GLOBAL factory — no workspace_id. Announcement is platform-wide.
 * Requires at least one Admin row for created_by/updated_by FK.
 */
class AnnouncementFactory extends Factory
{
    protected $model = Announcement::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $title = fake()->sentence(4);
        $body = fake()->paragraph(3);

        return [
            'title' => $title,
            'slug' => Str::slug($title),
            'body' => $body,
            'body_html' => AnnouncementMarkdown::toHtml($body),
            'category' => fake()->randomElement(AnnouncementCategory::values()),
            'status' => AnnouncementStatus::Draft->value,
            'audience' => ['type' => 'all'],
            'cover_image' => null,
            'created_by' => Admin::factory(),
            'updated_by' => null,
        ];
    }

    /** State: published announcement with a past publish date. */
    public function published(): static
    {
        return $this->state(fn () => [
            'status' => AnnouncementStatus::Published->value,
            'published_at' => now()->subMinute(),
        ]);
    }

    /** State: draft (default, explicit alias). */
    public function draft(): static
    {
        return $this->state(fn () => [
            'status' => AnnouncementStatus::Draft->value,
            'published_at' => null,
        ]);
    }

    /** State: published but future-dated (not yet visible to tenants). */
    public function futureDated(): static
    {
        return $this->state(fn () => [
            'status' => AnnouncementStatus::Published->value,
            'published_at' => now()->addDay(),
        ]);
    }
}
