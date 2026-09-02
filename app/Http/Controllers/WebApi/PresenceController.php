<?php

namespace App\Http\Controllers\WebApi;

use App\Events\EventType;
use App\Http\Controllers\Controller;
use App\Jobs\ActionCableBroadcastJob;
use App\Support\OnlineStatusTracker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Thay RoomChannel#subscribed/update_presence của Chatwoot: Reverb không có
// hook subscribe phía server, nên FE gọi endpoint này làm heartbeat; server ghi
// presence rồi bắn presence.update về đúng pubsub_token người gọi.
class PresenceController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $account = $request->attributes->get('currentAccount');
        $user = $request->user();

        OnlineStatusTracker::updatePresence($account->id, 'User', $user->id);

        $presence = [
            'account_id' => $account->id,
            'users' => OnlineStatusTracker::getAvailableUsers($account->id),
            'contacts' => OnlineStatusTracker::getAvailableContacts($account->id),
        ];

        ActionCableBroadcastJob::dispatch([$user->pubsub_token], EventType::PRESENCE_UPDATE->value, $presence);

        return response()->json($presence);
    }
}
