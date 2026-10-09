<?php

namespace App\Support\Appearance;

use Illuminate\Validation\Rule;

/**
 * Chế độ màu của portal theo từng nhân viên, lưu ở `users.ui_settings.color_scheme`.
 * Chỉ portal (màn quản trị của shop) đổi theo; widget, trang công khai và super admin
 * luôn sáng (docs/ux-decisions.md).
 */
enum ColorScheme: string
{
    case Light = 'light';
    case Dark = 'dark';

    public const UI_SETTINGS_KEY = 'color_scheme';

    public const DEFAULT = self::Light;

    public static function fromUiSettings(?array $uiSettings): self
    {
        return self::tryFrom((string) data_get($uiSettings, self::UI_SETTINGS_KEY)) ?? self::DEFAULT;
    }

    /** Luật kiểm cho `ui_settings.color_scheme` trong request cập nhật hồ sơ. */
    public static function rules(): array
    {
        return ['ui_settings.'.self::UI_SETTINGS_KEY => ['sometimes', Rule::enum(self::class)]];
    }
}
