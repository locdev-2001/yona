<?php

namespace App\Services;

use App\Notifications\EntityNotification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;
use App\Models\User;
use App\Models\WorkspaceMember;

/**
 * Façade for in-app notifications. All writes go through here to enforce:
 *  - self-notify guard: actor never receives their own notification.
 *  - inactive-member guard: deactivated workspace members are skipped.
 *
 * All reads are scoped through $user->notifications() — never raw table queries.
 */
class NotificationService
{
    /**
     * Send a notification to one or more recipients, filtering out invalid ones.
     *
     * @param  User|Collection<int, User>|array<User>  $recipients
     */
    public function notify(User|Collection|array $recipients, EntityNotification $notification): void
    {
        $actorId = auth()->id();
        $workspace = currentWorkspace();

        /** @var Collection<int, User> $recipientCollection */
        $recipientCollection = $recipients instanceof User
            ? new Collection([$recipients])
            : Collection::make($recipients);

        if ($workspace !== null) {
            // Filter to active workspace members only (edge-case: deactivated user)
            $activeMemberIds = WorkspaceMember::query()
                ->where('workspace_id', $workspace->id)
                ->where('status', 'active')
                ->pluck('user_id')
                ->all();

            $recipientCollection = $recipientCollection->filter(
                fn (User $user) => in_array($user->id, $activeMemberIds, strict: true)
            );
        }

        // Self-notify guard: actor never notifies themselves
        if ($actorId !== null) {
            $recipientCollection = $recipientCollection->filter(
                fn (User $user) => $user->id !== $actorId
            );
        }

        if ($recipientCollection->isEmpty()) {
            return;
        }

        Notification::send($recipientCollection, $notification);
    }

    /**
     * Mark a single notification as read. abort(404) if it doesn't belong to $user
     * (non-enumeration, BR-X15).
     */
    public function markRead(User $user, string $notificationId): void
    {
        /** @var DatabaseNotification|null $notification */
        $notification = $user->notifications()->find($notificationId);

        if ($notification === null) {
            abort(404);
        }

        $notification->markAsRead();
    }

    /**
     * Mark all unread notifications as read for the user.
     */
    public function markAllRead(User $user): void
    {
        $user->unreadNotifications()->update(['read_at' => now()]);
    }

    /**
     * Count of unread notifications for the user.
     */
    public function unreadCount(User $user): int
    {
        return $user->unreadNotifications()->count();
    }
}
