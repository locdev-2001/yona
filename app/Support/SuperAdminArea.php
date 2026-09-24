<?php

namespace App\Support;

use Illuminate\Http\Request;

// Các đường dẫn chạy trên guard `super_admin`: console quản trị và ba dashboard
// vận hành của gói ngoài (/horizon, /pulse, /log-viewer). Nguồn duy nhất cho mọi
// chỗ cần biết "request này thuộc vùng super admin".
final class SuperAdminArea
{
    private const PATH_PATTERNS = [
        'super_admin', 'super_admin/*',
        'horizon', 'horizon/*',
        'pulse', 'pulse/*',
        'log-viewer', 'log-viewer/*',
    ];

    public static function matches(Request $request): bool
    {
        return $request->is(...self::PATH_PATTERNS);
    }
}
