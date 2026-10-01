<?php

// Tổng quan console quản trị: dữ liệu widget và bố cục kéo thả. Nạp bên trong
// nhóm /admin đã qua auth:super_admin + bắt buộc 2FA ở routes/web.php.

use App\Http\Controllers\SuperAdmin\DashboardLayoutController;
use App\Http\Controllers\SuperAdmin\DashboardWidgetsController;
use Illuminate\Support\Facades\Route;

Route::prefix('/api/dashboard')->group(function () {
    Route::get('/widgets/{key}', [DashboardWidgetsController::class, 'show'])->where('key', '[a-z_]+');
    Route::get('/layout', [DashboardLayoutController::class, 'show']);
    Route::put('/layout', [DashboardLayoutController::class, 'update']);
    Route::delete('/layout', [DashboardLayoutController::class, 'destroy']);
});
