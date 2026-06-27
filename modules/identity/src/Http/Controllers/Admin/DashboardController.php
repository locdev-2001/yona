<?php

namespace Modules\Identity\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Modules\Identity\Models\Admin;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'workspaces' => Workspace::count(),
                'users' => User::count(),
                'admins' => Admin::count(),
                'signups24h' => User::where('created_at', '>=', now()->subDay())->count(),
            ],
        ]);
    }
}
