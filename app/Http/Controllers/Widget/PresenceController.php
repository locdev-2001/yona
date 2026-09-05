<?php

namespace App\Http\Controllers\Widget;

use App\Events\EventType;
use App\Jobs\ActionCableBroadcastJob;
use App\Support\OnlineStatusTracker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// RoomChannel#update_subscription + #broadcast_presence, nhánh KHÁCH: widget
// gốc gọi perform('update_presence') mỗi 60s qua ActionCable. Reverb không có
// hook subscribe phía server nên heartbeat đi bằng HTTP, giống
// WebApi\PresenceController của dashboard.
//
// Khác nhánh agent: payload KHÔNG kèm danh sách contacts
// (`data[:contacts] ... if @current_user.is_a? User`).
class PresenceController extends WidgetController
{
    public function update(Request $request): JsonResponse
    {
        $account = $this->account($request);
        $contactInbox = $this->contactInbox($request);

        OnlineStatusTracker::updatePresence($account->id, 'Contact', $contactInbox->contact_id);

        $presence = [
            'account_id' => $account->id,
            'users' => OnlineStatusTracker::getAvailableUsers($account->id),
        ];

        ActionCableBroadcastJob::dispatch([$contactInbox->pubsub_token], EventType::PRESENCE_UPDATE->value, $presence);

        return response()->json($presence);
    }
}
