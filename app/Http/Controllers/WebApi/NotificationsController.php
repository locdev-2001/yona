<?php

namespace App\Http\Controllers\WebApi;

use App\Finders\NotificationFinder;
use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Jobs\Notification\DeleteNotificationJob;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Notification;
use App\Support\DateRangeHelper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::NotificationsController.
class NotificationsController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $finder = $this->finder($request, $account);

        return response()->json([
            'data' => [
                'meta' => [
                    'unread_count' => $finder->unreadCount(),
                    'count' => $finder->count(),
                    'current_page' => $finder->currentPage(),
                ],
                'payload' => NotificationResource::collectionFor($finder->notifications()),
            ],
        ]);
    }

    public function unreadCount(Request $request, Account $account): JsonResponse
    {
        return response()->json($this->finder($request, $account)->unreadCount());
    }

    // read_all: không có primary_actor thì đánh dấu đã đọc toàn bộ account.
    public function readAll(Request $request, Account $account): Response
    {
        $query = $this->userNotifications($request, $account)->unread();
        $primaryActor = $this->primaryActor($request, $account);

        if ($primaryActor !== null) {
            $query->where('primary_actor_type', $primaryActor->getMorphClass())
                ->where('primary_actor_id', $primaryActor->id);
        }

        $query->get()->each(fn (Notification $notification) => $notification->update(['read_at' => now()]));

        return response()->noContent(200);
    }

    public function update(Request $request, Account $account, int $notificationId): JsonResponse
    {
        $notification = $this->fetchNotification($request, $account, $notificationId);
        $notification->update(['read_at' => now()]);

        return response()->json((new NotificationResource($notification))->toArray($request));
    }

    public function unread(Request $request, Account $account, int $notificationId): JsonResponse
    {
        $notification = $this->fetchNotification($request, $account, $notificationId);
        $notification->update(['read_at' => null]);

        return response()->json((new NotificationResource($notification))->toArray($request));
    }

    public function destroy(Request $request, Account $account, int $notificationId): Response
    {
        $this->fetchNotification($request, $account, $notificationId)->delete();

        return response()->noContent(200);
    }

    public function destroyAll(Request $request, Account $account): Response
    {
        DeleteNotificationJob::dispatch(
            $request->user(),
            $account,
            $request->input('type') === DeleteNotificationJob::TYPE_READ
                ? DeleteNotificationJob::TYPE_READ
                : DeleteNotificationJob::TYPE_ALL,
        );

        return response()->noContent(200);
    }

    // snooze: xoá dấu "vừa hết hoãn" để thẻ hiện lại mốc hoãn mới.
    public function snooze(Request $request, Account $account, int $notificationId): JsonResponse
    {
        $notification = $this->fetchNotification($request, $account, $notificationId);
        $snoozedUntil = $request->input('snoozed_until');

        if ($snoozedUntil !== null) {
            $notification->update([
                'snoozed_until' => DateRangeHelper::parseDateTime($snoozedUntil),
                'meta' => [...($notification->meta ?? []), 'last_snoozed_at' => null],
            ]);
        }

        return response()->json((new NotificationResource($notification))->toArray($request));
    }

    private function fetchNotification(Request $request, Account $account, int $notificationId): Notification
    {
        return $this->userNotifications($request, $account)->whereKey($notificationId)->firstOrFail();
    }

    /** @return Builder<Notification> */
    private function userNotifications(Request $request, Account $account)
    {
        return Notification::query()
            ->where('user_id', $request->user()->id)
            ->where('account_id', $account->id);
    }

    private function primaryActor(Request $request, Account $account): ?Conversation
    {
        $type = $request->input('primary_actor_type');

        if (! in_array($type, Notification::PRIMARY_ACTORS, true)) {
            return null;
        }

        return $account->conversations()->find($request->input('primary_actor_id'));
    }

    private function finder(Request $request, Account $account): NotificationFinder
    {
        return new NotificationFinder($request->user(), $account, [
            'page' => $request->query('page'),
            'includes' => (array) $request->query('includes', []),
            'sort_order' => $request->query('sort_order'),
        ]);
    }
}
