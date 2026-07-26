<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Modules\Chat\Delivery\SeenSyncService;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bật/tắt báo-đã-xem cho TỪNG kênh. Mặc định TẮT.
 *
 * Quyền lấy từ descriptor của chính kênh đó — controller không biết tên kênh nào.
 */
class InboxSettingController extends Controller
{
    public function updateSeenSync(
        Request $request,
        string $channel,
        SettingsService $settings,
        ChannelRegistry $channels,
    ): JsonResponse {
        abort_unless(auth()->user()?->can($channels->descriptor($channel)->managePermission->value), 403);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $settings->set(SeenSyncService::SETTING_KEY.'.'.$channel, (bool) $validated['enabled']);

        return response()->json(['ok' => true, 'enabled' => (bool) $validated['enabled']]);
    }
}
