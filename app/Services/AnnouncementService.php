<?php

namespace App\Services;

use App\Enums\AnnouncementStatus;
use App\Models\Announcement;
use App\Support\AnnouncementMarkdown;
use Illuminate\Support\Str;

/**
 * Owns all admin-plane writes for announcements.
 *
 * Server-controlled fields (created_by, updated_by, status, published_at) are
 * set exclusively here — never from request body (BR-X12).
 *
 * Uses the default runtime DB connection (cho_rach_app). Announcements are a
 * GLOBAL table — no workspace context, no RLS, no BelongsToWorkspace.
 */
class AnnouncementService
{
    /**
     * Create a new announcement in draft status.
     *
     * @param  array<string, mixed>  $data  Validated fields from StoreAnnouncementRequest.
     */
    public function create(array $data): Announcement
    {
        $slug = $this->resolveSlug($data['slug'] ?? null, $data['title']);

        $announcement = new Announcement;
        $announcement->title = $data['title'];
        $announcement->slug = $slug;
        $announcement->body = $data['body'];
        $announcement->body_html = AnnouncementMarkdown::toHtml($data['body']);
        $announcement->category = $data['category'];
        $announcement->audience = $this->normalizeAudience($data['audience'] ?? null);
        $announcement->cover_image = $data['cover_image'] ?? null;
        $announcement->status = AnnouncementStatus::Draft;
        $announcement->created_by = auth('admin')->id();
        $announcement->updated_by = auth('admin')->id();
        $announcement->save();

        return $announcement;
    }

    /**
     * Update mutable fields on an existing announcement (any status).
     * Re-renders body_html from raw body.
     *
     * @param  array<string, mixed>  $data  Validated fields from UpdateAnnouncementRequest.
     */
    public function update(Announcement $announcement, array $data): Announcement
    {
        if (isset($data['slug']) && $data['slug'] !== '') {
            $announcement->slug = $data['slug'];
        } elseif (isset($data['title'])) {
            $announcement->slug = $this->resolveSlug(null, $data['title']);
        }

        if (isset($data['title'])) {
            $announcement->title = $data['title'];
        }

        if (isset($data['body'])) {
            $announcement->body = $data['body'];
            $announcement->body_html = AnnouncementMarkdown::toHtml($data['body']);
        }

        if (isset($data['category'])) {
            $announcement->category = $data['category'];
        }

        if (isset($data['audience'])) {
            $announcement->audience = $this->normalizeAudience($data['audience']);
        }

        if (array_key_exists('cover_image', $data)) {
            $announcement->cover_image = $data['cover_image'];
        }

        $announcement->updated_by = auth('admin')->id();
        $announcement->save();

        return $announcement;
    }

    /**
     * Transition announcement to published status (atomic).
     * Hook point for future fan-out notifications.
     */
    public function publish(Announcement $announcement): Announcement
    {
        $announcement->status = AnnouncementStatus::Published;
        $announcement->published_at = now();
        $announcement->updated_by = auth('admin')->id();
        $announcement->save();

        return $announcement;
    }

    /**
     * Retract a published announcement back to draft.
     */
    public function unpublish(Announcement $announcement): Announcement
    {
        $announcement->status = AnnouncementStatus::Draft;
        $announcement->published_at = null;
        $announcement->updated_by = auth('admin')->id();
        $announcement->save();

        return $announcement;
    }

    /**
     * Derive slug: use provided value when non-empty, otherwise generate from title.
     */
    private function resolveSlug(?string $slug, string $title): string
    {
        return ($slug !== null && $slug !== '') ? $slug : Str::slug($title);
    }

    /**
     * Coerce audience to an array so the model's `array` cast stores it as a jsonb
     * object — never a double-encoded string. Forms submit it as a JSON string,
     * which would otherwise be re-encoded and break the `audience->>'type'` filter.
     *
     * @return array<string, mixed>
     */
    private function normalizeAudience(mixed $audience): array
    {
        if (is_string($audience)) {
            $decoded = json_decode($audience, true);
            $audience = is_array($decoded) ? $decoded : null;
        }

        return is_array($audience) && $audience !== [] ? $audience : ['type' => 'all'];
    }
}
