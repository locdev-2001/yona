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
