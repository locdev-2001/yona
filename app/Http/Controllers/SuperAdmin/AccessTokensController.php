<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\AccessTokenDashboard;

// Port từ refs/chatwoot/app/controllers/super_admin/access_tokens_controller.rb
// — chỉ index và show.
class AccessTokensController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(AccessTokenDashboard::class);
    }
}
