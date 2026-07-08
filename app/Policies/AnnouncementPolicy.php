<?php

namespace App\Policies;

use App\Enums\AnnouncementStatus;
use App\Models\Announcement;
use App\Models\User;
use App\Models\Workspace;
use App\Support\AudienceResolver;

/**
 * Tenant-plane (web guard) authorization for announcements.
 *
 * Only published, past-due, audience-matching announcements are visible to
 * tenant users. Drafts are invisible — controllers MUST abort(404) on false
 * (BR-X15). Admin-plane CRUD is gated by admin.can middleware, not this policy.
 */
class AnnouncementPolicy
{
    /**
     * Whether the user can view (read) the announcement.
     * Returns false for drafts, future-dated posts, or mismatched audience.
     */
    public function view(User $user, Announcement $announcement, ?Workspace $workspace = null): bool
    {
        return $this->isLive($announcement)
            && AudienceResolver::canView($announcement->audience ?? [], $workspace);
    }

    /**
     * Whether the user can mark the announcement as read.
     * Same gate as view — only live, audience-matching announcements.
     */
    public function markRead(User $user, Announcement $announcement, ?Workspace $workspace = null): bool
    {
        return $this->isLive($announcement)
            && AudienceResolver::canView($announcement->audience ?? [], $workspace);
    }

    /**
     * True when the announcement is published AND its publish date has elapsed.
     */
    private function isLive(Announcement $announcement): bool
    {
        return $announcement->status === AnnouncementStatus::Published
            && $announcement->published_at !== null
            && $announcement->published_at->lte(now());
    }
}
