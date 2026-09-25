<?php

namespace App\Http\Controllers\Widget;

use App\Http\Resources\Widget\WidgetAgentResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// (skip_before_action :set_contact — khách chưa có phiên vẫn xem được đội ngũ).
class InboxMembersController extends WidgetController
{
    public function index(Request $request): JsonResponse
    {
        $account = $this->account($request);
        $agents = $this->inbox($request)->members()->with('accountUsers')->get();

        return response()->json([
            'payload' => $agents->map(fn (User $agent) => WidgetAgentResource::make($agent, $account->id))->values()->all(),
        ]);
    }
}
