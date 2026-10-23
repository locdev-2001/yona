<?php

namespace App\Support;

use Illuminate\Http\Request;

// Các đường dẫn chạy trên guard `super_admin`: console quản trị và ba dashboard
// vận hành của gói ngoài (/horizon, /pulse, /logs). Nguồn duy nhất cho mọi
// chỗ cần biết "request này thuộc vùng super admin" và console nằm ở đâu.
final class SuperAdminArea
{
    public const PREFIX = 'admin';

    // Đường dẫn cũ của console, chỉ còn để chuyển hướng bookmark sang PREFIX.
    public const LEGACY_PREFIX = 'super_admin';

    private const OPERATIONS_PATH_PATTERNS = [
        'horizon', 'horizon/*',
        'pulse', 'pulse/*',
    ];

    public static function url(string $path = ''): string
    {
        $path = trim($path, '/');

        return '/'.self::PREFIX.($path === '' ? '' : '/'.$path);
    }

    public static function canonicalPath(string $path): string
    {
        $segments = explode('/', trim($path, '/'));
        $resourceIndex = ($segments[0] ?? '') === 'api' ? 1 : 0;
        $resource = $segments[$resourceIndex] ?? '';
        $legacyResources = [
            'access_tokens', 'account_users', 'agent_bots', 'platform_apps',
            'installation_configs', 'app_config', 'audit_logs', 'channel_health',
            'feature_usage', 'instance_status', 'sticker_packs', 'push_subscriptions', 'call_quality',
        ];

        if ($resource === 'sign_in' && $resourceIndex === 0) {
            $segments[0] = 'login';
        } elseif (in_array($resource, $legacyResources, true)) {
            $segments[$resourceIndex] = str_replace('_', '-', $resource);
        }

        $actionIndex = $resourceIndex + 2;
        $action = $segments[$actionIndex] ?? '';
        if (($resource === 'accounts' && in_array($action, ['sticker_packs', 'reset_cache'], true))
            || ($resource === 'users' && $action === 'resend_confirmation')) {
            $segments[$actionIndex] = str_replace('_', '-', $action);
        }

        if (in_array($resource, ['feature_usage', 'feature-usage'], true) && isset($segments[$resourceIndex + 1])) {
            $segments[$resourceIndex + 1] = str_replace('_', '-', $segments[$resourceIndex + 1]);
        }

        return implode('/', $segments);
    }

    public static function isConsole(Request $request): bool
    {
        return $request->is(self::PREFIX, self::PREFIX.'/*');
    }

    public static function matches(Request $request): bool
    {
        $logViewerPath = trim((string) config('log-viewer.route_path'), '/');

        return self::isConsole($request)
            || $request->is(...self::OPERATIONS_PATH_PATTERNS, ...($logViewerPath === '' ? [] : [$logViewerPath, $logViewerPath.'/*']));
    }
}
