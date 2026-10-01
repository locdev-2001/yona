<?php

namespace App\Services\Admin\Alerts;

use App\Models\SuperAdmin;
use App\Notifications\AlertNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

// Gửi một thông báo cảnh báo tới mọi super admin. Một người nhận hỏng (hộp thư
// sai, máy chủ thư lỗi) không được chặn người khác hay làm hỏng lượt đánh giá.
class AlertNotifier
{
    public function toAllSuperAdmins(AlertMessage $message): int
    {
        $sent = 0;

        foreach (SuperAdmin::query()->orderBy('id')->get() as $superAdmin) {
            $sent += $this->deliver($superAdmin, $message) ? 1 : 0;
        }

        return $sent;
    }

    public function deliver(SuperAdmin $superAdmin, AlertMessage $message): bool
    {
        try {
            Notification::sendNow($superAdmin, new AlertNotification($message));

            return true;
        } catch (Throwable $exception) {
            Log::error('[ALERT] Gửi cảnh báo cho super admin thất bại', [
                'super_admin_id' => $superAdmin->id,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }
}
