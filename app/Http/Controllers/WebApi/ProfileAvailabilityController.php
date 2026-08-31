<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Tương đương Api::V1::ProfilesController#availability + #auto_offline của
// Chatwoot (cập nhật account_users theo account đang đứng).
class ProfileAvailabilityController extends Controller
{
    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'availability' => ['required', 'in:online,busy,offline'],
        ]);

        $availabilityIndex = array_search($data['availability'], ['online', 'busy', 'offline'], true);

        $request->attributes->get('currentAccountUser')->update(['availability' => $availabilityIndex]);

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
