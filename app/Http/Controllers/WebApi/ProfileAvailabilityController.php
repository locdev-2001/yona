<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\AccountUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Trạng thái sẵn sàng + tự offline của hồ sơ: cập nhật account_users theo account đang đứng.
class ProfileAvailabilityController extends Controller
{
    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'availability' => ['required', 'in:online,offline,busy'],
        ]);

        $request->attributes->get('currentAccountUser')->update([
            'availability' => AccountUser::availabilityFromName($data['availability']),
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
