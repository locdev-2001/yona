<?php

namespace App\Http\Controllers\Platform\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Middleware\AuthenticatePlatformApp;
use App\Models\PlatformApp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Lớp nền của
// Platform API: app đã xác thực nằm trong request, mọi bản ghi thao tác phải
// nằm trong danh sách permissible của app đó.
abstract class PlatformController extends Controller
{
    protected function platformApp(Request $request): PlatformApp
    {
        return $request->attributes->get(AuthenticatePlatformApp::PLATFORM_APP);
    }

    /** validate_platform_app_permissible — 401 'Non permissible resource' như bản gốc. */
    protected function denyUnlessPermissible(Request $request, Model $resource): ?JsonResponse
    {
        return $this->platformApp($request)->permits($resource)
            ? null
            : response()->json(['error' => 'Non permissible resource'], 401);
    }
}
