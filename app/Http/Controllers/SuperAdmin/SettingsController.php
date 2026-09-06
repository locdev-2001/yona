<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

// Port từ refs/chatwoot/app/controllers/super_admin/settings_controller.rb —
// bản CE chỉ còn danh sách mục cấu hình (phần gói cước/billing là enterprise).
class SettingsController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('superadmin/Settings', [
            'sections' => array_map(fn (string $section) => [
                'key' => $section,
                'label' => Str::headline($section),
                'url' => "/super_admin/app_config?config={$section}",
            ], AppConfigsController::sections()),
        ]);
    }
}
