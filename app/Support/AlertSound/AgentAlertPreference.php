<?php

namespace App\Support\AlertSound;

use Illuminate\Validation\Rule;

/**
 * Tuỳ chọn âm báo tin mới của từng nhân viên, lưu ở `users.ui_settings.notification_sound`:
 * bật/tắt, âm nào, kêu với mọi hội thoại hay chỉ hội thoại giao cho mình, và có chỉ
 * kêu khi tab Yona không được mở hay không. Dashboard quyết định kêu hay không
 * (resources/js/dashboard/alertSound); máy chủ chỉ giữ cho dữ liệu lưu vào hợp lệ.
 */
final class AgentAlertPreference
{
    public const UI_SETTINGS_KEY = 'notification_sound';

    public const SCOPES = ['all', 'assigned'];

    /** Luật kiểm cho `ui_settings.notification_sound` trong request cập nhật hồ sơ. */
    public static function rules(): array
    {
        $field = 'ui_settings.'.self::UI_SETTINGS_KEY;

        return [
            $field => ['sometimes', 'array:enabled,tone,scope,only_when_hidden'],
            "{$field}.enabled" => ["required_with:{$field}", 'boolean'],
            "{$field}.tone" => ["required_with:{$field}", Rule::in(AlertTones::all())],
            "{$field}.scope" => ["required_with:{$field}", Rule::in(self::SCOPES)],
            "{$field}.only_when_hidden" => ["required_with:{$field}", 'boolean'],
        ];
    }
}
