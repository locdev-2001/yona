<?php

namespace App\Http\Controllers\Shared;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Thin controller for in-app notifications.
 * All access scoped through $user->notifications() — never raw table queries.
 * Non-enumeration: notification not found for current user → 404 (via service).
 */
class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notificationService) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $notifications = $user->notifications()
            ->paginate(20)
            ->through(fn ($n) => [
                'id' => $n->id,
                'action' => data_get($n->data, 'action'),
                'subject_type' => data_get($n->data, 'subject_type'),
                'subject_id' => data_get($n->data, 'subject_id'),
                'payload' => data_get($n->data, 'payload', []),
                'link' => data_get($n->data, 'link'),
                'read_at' => $n->read_at?->toISOString(),
                'created_at' => $n->created_at?->toISOString(),
            ]);

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'unread_count' => $this->notificationService->unreadCount($user),
        ]);
    }

    public function read(Request $request, string $id): RedirectResponse
    {
        $this->notificationService->markRead($request->user(), $id);

        return back()->with('success', __('notification.marked_read'));
    }

    public function readAll(Request $request): RedirectResponse
    {
        $this->notificationService->markAllRead($request->user());

        return back()->with('success', __('notification.marked_all_read'));
    }
}
