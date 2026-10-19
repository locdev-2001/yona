<?php

namespace App\Support\SuperAdmin;

use App\Http\Controllers\SuperAdmin\AppConfigsController;
use App\Support\SuperAdminArea;
use Illuminate\Support\Str;

// Thanh bên của console quản trị chia theo vùng chức năng. Nhãn dịch sẵn ở máy
// chủ; icon do layout tự gán theo `key` (Tailwind chỉ sinh class viết nguyên văn
// trong mã React).
final class ConsoleNavigation
{
    public const DASH_URL = 'https://dash.yona.vn';

    /**
     * @return list<array{key: string, label: string, items: list<array<string, mixed>>}>
     */
    public static function groups(): array
    {
        $groups = [
            'overview' => [self::item('dashboard', SuperAdminArea::url(), exact: true)],
            'customers' => [
                self::item('accounts', SuperAdminArea::url('accounts')),
                self::item('users', SuperAdminArea::url('users')),
                self::item('abuse_reports', SuperAdminArea::url('abuse_reports')),
            ],
            'channels' => [
                self::item('channel_health', SuperAdminArea::url('channel_health')),
                self::item('instance_status', SuperAdminArea::url('instance_status')),
                self::item('alerts', SuperAdminArea::url('alerts')),
            ],
            'data' => [
                self::item('feature_usage', SuperAdminArea::url('feature_usage')),
                self::item('data', SuperAdminArea::url('data')),
            ],
            'content' => [self::item('sticker_packs', SuperAdminArea::url('sticker_packs'))],
            'integrations' => [
                self::item('agent_bots', SuperAdminArea::url('agent_bots')),
                self::item('platform_apps', SuperAdminArea::url('platform_apps')),
                self::item('access_tokens', SuperAdminArea::url('access_tokens')),
            ],
            'config' => [
                self::item('branding', SuperAdminArea::url('branding')),
                self::item('app_config', SuperAdminArea::url('app_config'), children: self::appConfigSections()),
                self::item('installation_configs', SuperAdminArea::url('installation_configs')),
            ],
            'security' => [
                self::item('audit_logs', SuperAdminArea::url('audit_logs')),
                self::item('impersonations', SuperAdminArea::url('impersonations')),
            ],
            'tools' => array_values(array_filter([
                self::externalTool('horizon', config('horizon.path')),
                self::externalTool('pulse', config('pulse.path')),
                self::externalTool('logs', config('log-viewer.route_path')),
                self::item('dash', self::DASH_URL, external: true),
            ])),
        ];

        return array_map(fn (string $key) => [
            'key' => $key,
            'label' => __("admin_layout.groups.{$key}"),
            'items' => $groups[$key],
        ], array_keys($groups));
    }

    /** @return array<string, string> */
    public static function labels(): array
    {
        return (array) __('admin_layout.labels');
    }

    /** @return array{attributes: array<string, string>, filters: array<string, string>} */
    public static function dictionary(): array
    {
        return [
            'attributes' => (array) __('admin_layout.attributes'),
            'filters' => (array) __('admin_layout.filters'),
        ];
    }

    /**
     * Các mục của trang Cấu hình ứng dụng, nhãn tiếng Việt (tên riêng viết đúng
     * hoa thường: TikTok, WhatsApp).
     *
     * @return list<array{key: string, label: string, title: string, url: string}>
     */
    public static function appConfigSections(): array
    {
        return array_map(fn (string $section) => [
            'key' => $section,
            'label' => self::appConfigSectionLabel($section),
            'title' => self::appConfigSectionTitle($section),
            'url' => SuperAdminArea::url("app_config?config={$section}"),
        ], AppConfigsController::sections());
    }

    public static function appConfigSectionLabel(string $section): string
    {
        $key = "admin_layout.app_config.sections.{$section}";

        return __($key) === $key ? Str::headline($section) : __($key);
    }

    public static function appConfigSectionTitle(string $section): string
    {
        $key = "admin_layout.app_config.section_titles.{$section}";

        return __($key) === $key
            ? str_replace('{section}', self::appConfigSectionLabel($section), (string) __('admin_layout.labels.app_config_title'))
            : __($key);
    }

    private static function externalTool(string $key, mixed $path): ?array
    {
        $path = trim((string) $path, '/');

        return $path === '' ? null : self::item($key, '/'.$path, external: true);
    }

    private static function item(string $key, string $url, bool $exact = false, bool $external = false, array $children = []): array
    {
        return array_filter([
            'key' => $key,
            'label' => __("admin_layout.nav.{$key}"),
            'url' => $url,
            'exact' => $exact ?: null,
            'external' => $external ?: null,
            'children' => $children ?: null,
        ], fn ($value) => $value !== null);
    }
}
