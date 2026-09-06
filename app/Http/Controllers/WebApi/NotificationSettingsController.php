<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\NotificationSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::NotificationSettingsController — `resource`
// (số ít): cài đặt của chính người đang đăng nhập trong account đang đứng.
class NotificationSettingsController extends Controller
{
    public function show(Request $request, Account $account): JsonResponse
    {
        return response()->json($this->payload($this->loadSetting($request, $account)));
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        $setting = $this->loadSetting($request, $account);
        $params = $request->input('notification_settings', []);

        foreach (NotificationSetting::DELIVERY_TYPES as $deliveryType) {
            $setting->setSelectedFlags($deliveryType, $params["selected_{$deliveryType}_flags"] ?? []);
        }
        $setting->save();

        return response()->json($this->payload($setting));
    }

    // Bản gốc dựa vào after_create của account_user để có sẵn bản ghi; tài khoản
    // tạo trước D5 chưa có nên dựng lại qua chính cổng đó.
    private function loadSetting(Request $request, Account $account): NotificationSetting
    {
        $setting = NotificationSetting::query()
            ->where('account_id', $account->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($setting !== null) {
            return $setting;
        }

        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        return $accountUser->createNotificationSetting();
    }

    private function payload(NotificationSetting $setting): array
    {
        return [
            'id' => $setting->id,
            'user_id' => $setting->user_id,
            'account_id' => $setting->account_id,
            'all_email_flags' => NotificationSetting::allFlags('email'),
            'selected_email_flags' => $setting->selectedFlags('email'),
            'all_push_flags' => NotificationSetting::allFlags('push'),
            'selected_push_flags' => $setting->selectedFlags('push'),
        ];
    }
}
