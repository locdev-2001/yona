<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\AccountUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Tương đương Api::V1::ProfilesController#availability + #auto_offline của
// Chatwoot (cập nhật account_users theo account đang đứng).
class ProfileAvailabilityController extends Controller
{
    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'availability' => ['required', 'in:online,offline,busy'],
        ]);

        $request->attributes->get('currentAccountUser')->update([
            'availability' => array_search($data['availability'], AccountUser::AVAILABILITY_NAMES, true),
        ]);

        return response()->json(['availability' => $data['availability']]);
    }

    public function autoOffline(Request $request): JsonResponse
    {
        $data = $request->validate([
            'auto_offline' => ['required', 'boolean'],
        ]);

        $request->attributes->get('currentAccountUser')->update(['auto_offline' => $data['auto_offline']]);

        return response()->json(['auto_offline' => $data['auto_offline']]);
    }
}
