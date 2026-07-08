<?php

namespace App\Http\Controllers\Identity\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\User;
use App\Models\Workspace;
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
