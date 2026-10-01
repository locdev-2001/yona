<?php

namespace App\Services\Admin\Metrics;

use App\Models\User;

// Bố cục trang Tổng quan của từng super admin, lưu trong users.ui_settings.
final class DashboardLayout
{
    public const SETTINGS_KEY = 'admin_dashboard_layout';

    public function __construct(private readonly WidgetRegistry $registry) {}

    /** @return list<array{key: string, size: string}> */
    public function defaults(): array
    {
        return array_map(
            static fn (DashboardWidget $widget) => ['key' => $widget->key(), 'size' => $widget->defaultSize()->value],
            $this->registry->all(),
        );
    }

    /** @return list<array{key: string, size: string}> */
    public function for(User $user): array
    {
        $saved = data_get($user->ui_settings, self::SETTINGS_KEY);

        // Ô đã gỡ khỏi danh mục hoặc kích thước không còn hợp lệ thì lặng lẽ bỏ qua.
        return is_array($saved) ? $this->sanitize($saved) : $this->defaults();
    }

    /** @param list<array{key: string, size: string}> $items */
    public function save(User $user, array $items): array
    {
        $layout = $this->sanitize($items);
        $user->forceFill(['ui_settings' => [...($user->ui_settings ?? []), self::SETTINGS_KEY => $layout]])->save();

        return $layout;
    }

    /** @return list<array{key: string, size: string}> */
    public function reset(User $user): array
    {
        $settings = $user->ui_settings ?? [];
        unset($settings[self::SETTINGS_KEY]);
        $user->forceFill(['ui_settings' => $settings])->save();

        return $this->defaults();
    }

    /**
     * @param  array<mixed>  $items
     * @return list<array{key: string, size: string}>
     */
    private function sanitize(array $items): array
    {
        $layout = [];
        foreach ($items as $item) {
            $key = is_array($item) ? ($item['key'] ?? null) : null;
            $size = is_array($item) ? WidgetSize::tryFrom((string) ($item['size'] ?? '')) : null;

            if (is_string($key) && $size !== null && $this->registry->has($key) && ! isset($layout[$key])) {
                $layout[$key] = ['key' => $key, 'size' => $size->value];
            }
        }

        return array_values($layout);
    }
}
