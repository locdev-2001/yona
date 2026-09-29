<?php

namespace App\Support;

use Illuminate\Http\Request;

// Các đường dẫn chạy trên guard `super_admin`: console quản trị và ba dashboard
// vận hành của gói ngoài (/horizon, /pulse, /logs). Nguồn duy nhất cho mọi
// chỗ cần biết "request này thuộc vùng super admin".
final class SuperAdminArea
{
    private const PATH_PATTERNS = [
        'super_admin', 'super_admin/*',
        'horizon', 'horizon/*',
        'pulse', 'pulse/*',
    ];

    public static function matches(Request $request): bool
    {
        $logViewerPath = trim((string) config('log-viewer.route_path'), '/');

        return $request->is(...self::PATH_PATTERNS, ...($logViewerPath === '' ? [] : [$logViewerPath, $logViewerPath.'/*']));
    }
}
