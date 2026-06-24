<?php

namespace App\Http\Controllers;

use App\Models\AnnouncementRead;
use App\Services\AnnouncementReadService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tenant-plane feed of published announcements (What's New page).
 *
 * Uses the default runtime DB connection. Announcements are GLOBAL — no workspace
 * scoping is applied here; audience resolution happens inside AnnouncementReadService.
 */
class WhatsNewController extends Controller
{
    public function __construct(private readonly AnnouncementReadService $readService) {}

    /**
     * Display a paginated feed of all visible (published) announcements.
     * Each item includes an `is_read` flag — computed without N+1 by pulling the
     * user's full read-set before mapping.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $paginator = $this->readService->visibleQuery($user)->paginate(15);

        // Collect read IDs for this page in a single query (avoids N+1).
        $pageIds = $paginator->getCollection()->pluck('id');
        $readIds = AnnouncementRead::where('user_id', $user->id)
            ->whereIn('announcement_id', $pageIds)
            ->pluck('announcement_id')
            ->flip(); // key-indexed for O(1) lookup

        $announcements = $paginator->through(fn ($announcement) => [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'slug' => $announcement->slug,
            'body_html' => $announcement->body_html,
            'category' => $announcement->category?->value,
            'published_at' => $announcement->published_at?->toISOString(),
            'cover_image' => $announcement->cover_image,
            'is_read' => $readIds->has($announcement->id),
        ]);

        return Inertia::render('announcements/index', [
            'announcements' => $announcements,
        ]);
    }
}
