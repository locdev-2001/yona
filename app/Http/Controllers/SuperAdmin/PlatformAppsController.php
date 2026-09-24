<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\PlatformAppDashboard;

// (Administrate mặc định, không đè action nào).
class PlatformAppsController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(PlatformAppDashboard::class);
    }
}
