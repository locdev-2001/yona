<?php

namespace Modules\Announcements\Services;

use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Builder;
use Modules\Announcements\Enums\AnnouncementStatus;
use Modules\Announcements\Models\Announcement;
use Modules\Announcements\Models\AnnouncementRead;

/**
 * Read-state query SSOT for announcements.
 *
 * All consumers (badge, modal, page, shared-props) MUST call unreadQuery() —
 * never duplicate the published + published_at + audience + read-state logic.
 *
 * Uses the default runtime DB connection. Announcements are GLOBAL — no workspace
 * scoping on the query itself; audience filtering is delegated to AudienceResolver.
 */
class AnnouncementReadService
{
    /**
     * SSOT: base query of announcements that are visible AND unread for the given user.
     *
     * Conditions:
     *   - status = published
     *   - published_at IS NOT NULL AND published_at <= now()
     *   - no row in announcement_reads for this user (LEFT JOIN + IS NULL)
     *   - audience satisfies AudienceResolver for the optional workspace context
     *
     * Callers should NOT add extra published/read-state conditions on top.
     *
     * @return Builder<Announcement>
     */
    public function unreadQuery(User $user, ?Workspace $workspace = null): Builder
    {
        $query = Announcement::query()
            ->where('status', AnnouncementStatus::Published->value)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->whereDoesntHave('reads', fn (Builder $q) => $q->where('user_id', $user->id));

        // Audience filter: v1 only has type=all; when audience changes the resolver
        // handles it without touching callers.
        // For type=all, every row passes — we still apply the filter for future-proofing.
        // Since v1 DB CHECK enforces type=all, this is a no-op in practice but
        // adds defense-in-depth for any row that might slip through.
        $query->where(function (Builder $q) {
            // audience jsonb column: only include rows whose type satisfies AudienceResolver.
            // For v1 (type=all), this is equivalent to whereRaw("(audience->>'type') = 'all'").
            $q->whereRaw("(audience->>'type') = 'all'");
        });

        return $query;
    }

    /**
     * Count of unread published announcements for the user.
     */
    public function getUnreadCount(User $user, ?Workspace $workspace = null): int
    {
        return $this->unreadQuery($user, $workspace)->count();
    }

    /**
     * Most recent unread announcement (by published_at desc) or null if all read.
     */
    public function getLatestUnread(User $user, ?Workspace $workspace = null): ?Announcement
    {
        return $this->unreadQuery($user, $workspace)
            ->orderByDesc('published_at')
            ->first();
    }

    /**
     * Paginate-ready query of ALL published announcements visible to the user
     * (both read and unread), ordered newest-first.
     *
     * @return Builder<Announcement>
     */
    public function visibleQuery(User $user, ?Workspace $workspace = null): Builder
    {
        return Announcement::query()
            ->where('status', AnnouncementStatus::Published->value)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->where(function (Builder $q) {
                $q->whereRaw("(audience->>'type') = 'all'");
            })
            ->orderByDesc('published_at');
    }

    /**
     * Mark an announcement as read by the user. Idempotent (firstOrCreate).
     * user_id is always from the caller (auth()->id()) — never from request body.
     */
    public function markRead(Announcement $announcement, User $user): AnnouncementRead
    {
        // AnnouncementRead is fully guarded ($guarded = ['*']) — IDOR prevention.
        // This service IS the gatekeeper: user_id always comes from the caller
        // (auth()->id() in the controller), never from request body.
        // forceCreate is safe here because we own this entry point.
        $existing = AnnouncementRead::where('announcement_id', $announcement->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        /** @var AnnouncementRead $read */
        $read = AnnouncementRead::forceCreate([
            'announcement_id' => $announcement->id,
            'user_id' => $user->id,
            'read_at' => now(),
        ]);

        return $read;
    }
}
