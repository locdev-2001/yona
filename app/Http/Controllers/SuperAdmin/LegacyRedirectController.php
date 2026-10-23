<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Support\SuperAdminArea;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LegacyRedirectController extends Controller
{
    public function __invoke(Request $request, string $path = ''): RedirectResponse
    {
        $canonicalPath = SuperAdminArea::canonicalPath($path);
        abort_if(SuperAdminArea::isConsole($request) && $canonicalPath === $path, 404);
        $query = $request->getQueryString();

        return redirect(SuperAdminArea::url($canonicalPath).($query === null ? '' : '?'.$query), 301);
    }
}
