<?php

namespace App\Http\Controllers\Widget;

use App\Http\Resources\UserResource;
use App\Models\Campaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// (skip_before_action :set_contact — widget hỏi campaign trước khi có phiên khách)
// + view index.json.jbuilder.
class CampaignsController extends WidgetController
{
    public function index(Request $request): JsonResponse
    {
        $account = $this->account($request);

        if (! $account->featureEnabled('campaigns')) {
            return response()->json([]);
        }

        $campaigns = $this->inbox($request)->campaigns()
            ->where('enabled', true)
            ->where('account_id', $account->id)
            ->with('sender')
            ->get();

        return response()->json($campaigns->map(fn (Campaign $campaign) => [
            'id' => $campaign->display_id,
            'trigger_rules' => $campaign->trigger_rules ?? [],
            'trigger_only_during_business_hours' => $campaign->trigger_only_during_business_hours,
            'message' => $campaign->message,
            'sender' => $campaign->sender === null
                ? null
                // KHÔNG truyền account: request widget không có Current.account nên
                // bản gốc trả availability_status = null.
                : UserResource::pushEventData($campaign->sender),
        ])->values()->all());
    }
}
