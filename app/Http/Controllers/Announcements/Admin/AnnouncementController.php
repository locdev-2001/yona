<?php

namespace App\Http\Controllers\Announcements\Admin;

use App\Enums\AnnouncementCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\Announcements\Admin\AnnouncementStoreRequest;
use App\Http\Requests\Announcements\Admin\AnnouncementUpdateRequest;
use App\Models\Announcement;
use App\Services\AnnouncementService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin-plane CRUD for announcements (index/create/store/edit/update/destroy).
 *
 * Thin controller — all business logic delegated to AnnouncementService.
 * Auth is enforced by route middleware (admin.can:platform.announcements.manage)
 * AND FormRequest::authorize() (double-check on mutating actions).
 */
class AnnouncementController extends Controller
{
    public function __construct(private readonly AnnouncementService $announcementService) {}

    public function index(): Response
    {
        $announcements = Announcement::query()
            ->orderByDesc('created_at')
            ->get(['id', 'title', 'slug', 'category', 'status', 'published_at', 'created_by'])
            ->map(fn (Announcement $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'slug' => $a->slug,
                'category' => $a->category?->value,
                'status' => $a->status->value,
                'published_at' => $a->published_at?->toIso8601String(),
            ]);

        return Inertia::render('announcements/admin/index', [
            'announcements' => $announcements,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('announcements/admin/create', [
            'categories' => AnnouncementCategory::values(),
        ]);
    }

    public function store(AnnouncementStoreRequest $request): RedirectResponse
    {
        $announcement = $this->announcementService->create($request->validated());

        return redirect()->route('admin.announcements.edit', $announcement)
            ->with('success', __('platform.announcements.admin.created'));
    }

    public function edit(Announcement $announcement): Response
    {
        return Inertia::render('announcements/admin/edit', [
            'announcement' => [
                'id' => $announcement->id,
                'title' => $announcement->title,
                'slug' => $announcement->slug,
                'body' => $announcement->body,
                'category' => $announcement->category?->value,
                'status' => $announcement->status->value,
                'cover_image' => $announcement->cover_image,
                'audience' => $announcement->audience,
                'published_at' => $announcement->published_at?->toIso8601String(),
            ],
            'categories' => AnnouncementCategory::values(),
        ]);
    }

    public function update(AnnouncementUpdateRequest $request, Announcement $announcement): RedirectResponse
    {
        $this->announcementService->update($announcement, $request->validated());

        return redirect()->route('admin.announcements.edit', $announcement)
            ->with('success', __('platform.announcements.admin.updated'));
    }

    public function destroy(Announcement $announcement): RedirectResponse
    {
        $announcement->delete();

        return redirect()->route('admin.announcements.index')
            ->with('success', __('platform.announcements.admin.deleted'));
    }
}
