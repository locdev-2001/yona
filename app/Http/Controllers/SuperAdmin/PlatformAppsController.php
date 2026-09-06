<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\PlatformAppDashboard;

// Port từ refs/chatwoot/app/controllers/super_admin/platform_apps_controller.rb
// (Administrate mặc định, không đè action nào).
class PlatformAppsController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(PlatformAppDashboard::class);
    }
}
