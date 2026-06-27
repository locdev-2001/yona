<?php

namespace Modules\Announcements\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Modules\Announcements\Models\Announcement;
use Modules\Announcements\Services\AnnouncementReadService;

/**
 * Marks an announcement as read for the authenticated user.
 *
 * Security:
 *   - Authorizes 'view' policy (returns 404 for drafts — BR-X15/non-enumeration).
 *   - user_id is always taken from auth()->id(), never from request body (BR-X12).
 *   - Idempotent: repeated calls are safe (firstOrCreate).
 */
class AnnouncementReadController extends Controller
{
    public function __construct(private readonly AnnouncementReadService $readService) {}

    /**
     * Mark the announcement as read. Returns a redirect back to the previous page.
     *
     * Returns 404 (not 403) when the announcement is not visible — BR-X15 non-enumeration:
     * draft announcements must not leak their existence to tenant users.
     */
    public function __invoke(Request $request, Announcement $announcement): RedirectResponse
    {
        // abort(404) on false — hides draft existence from tenants (BR-X15).
        // We use 404 instead of 403 deliberately: tenants must not know drafts exist.
        abort_unless($request->user()->can('view', $announcement), 404);

        $this->readService->markRead($announcement, $request->user());

        return back();
    }
}
