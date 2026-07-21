<?php

namespace App\Http\Controllers\Inbox;

use App\Enums\TenantPermission;
use App\Http\Controllers\Controller;
use App\Services\Inbox\SeenSyncService;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * P06b — toggle seen-sync per-workspace. DEFAULT OFF (A4 founder). Chỉ
 * tenant.zalo.manage bật/tắt — founder quyết định bật ON sau spike rate P09.
 */
class InboxSettingController extends Controller
{
    public function updateSeenSync(Request $request, SettingsService $settings): JsonResponse
    {
        abort_unless(auth()->user()?->can(TenantPermission::ZaloManage->value), 403);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $settings->set(SeenSyncService::SETTING_KEY, (bool) $validated['enabled']);

        return response()->json(['ok' => true, 'enabled' => (bool) $validated['enabled']]);
    }
}
