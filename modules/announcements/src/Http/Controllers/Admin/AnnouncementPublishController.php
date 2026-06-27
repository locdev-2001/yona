<?php

namespace Modules\Announcements\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Modules\Announcements\Models\Announcement;
use Modules\Announcements\Services\AnnouncementService;

/**
 * Atomic publish/unpublish actions for announcements.
 *
 * Separated from AnnouncementController so publish state-change is an isolated
 * action — a clear hook point for future fan-out notifications without muddying
 * the CRUD controller.
 *
 * Auth enforced by route middleware (admin.can:platform.announcements.manage).
 */
class AnnouncementPublishController extends Controller
{
    public function __construct(private readonly AnnouncementService $announcementService) {}

    /** Publish: transition to published status. */
    public function store(Announcement $announcement): RedirectResponse
    {
        $this->announcementService->publish($announcement);

        return redirect()->route('admin.announcements.edit', $announcement)
            ->with('success', __('platform.announcements.admin.published'));
    }

    /** Unpublish: retract back to draft. */
    public function destroy(Announcement $announcement): RedirectResponse
    {
        $this->announcementService->unpublish($announcement);

        return redirect()->route('admin.announcements.edit', $announcement)
            ->with('success', __('platform.announcements.admin.unpublished'));
    }
}
