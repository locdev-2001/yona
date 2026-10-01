<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Support\SuperAdminArea;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

// Bản CE chỉ còn danh sách mục cấu hình (phần gói cước/billing là enterprise).
class SettingsController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('superadmin/Settings', [
            'sections' => array_map(fn (string $section) => [
                'key' => $section,
                'label' => Str::headline($section),
                'url' => SuperAdminArea::url("app_config?config={$section}"),
            ], AppConfigsController::sections()),
        ]);
    }
}
