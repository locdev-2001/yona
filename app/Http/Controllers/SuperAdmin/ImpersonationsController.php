<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\SuperAdminImpersonationDashboard;
use Illuminate\Database\Eloquent\Builder;

// Nhật ký đăng nhập hộ (dash #38) — chỉ đọc, lọc theo super admin/account qua
// query string (?super_admin_id=&account_id=) ngoài cơ chế search chung.
class ImpersonationsController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(SuperAdminImpersonationDashboard::class);
    }

    protected function scopedQuery(): Builder
    {
        $query = parent::scopedQuery()->with(['superAdmin', 'targetUser', 'account']);
        $request = request();

        if ($request->filled('super_admin_id')) {
            $query->where('super_admin_id', (int) $request->query('super_admin_id'));
        }

        if ($request->filled('account_id')) {
            $query->where('account_id', (int) $request->query('account_id'));
        }

        return $query;
    }
}
