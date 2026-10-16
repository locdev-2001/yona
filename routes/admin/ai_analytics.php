<?php

// Phân tích AI trong console quản trị: chỉ đọc bảng tổng kết ai_usage_analytics.
// Nạp bên trong nhóm /admin đã qua auth:super_admin + bắt buộc 2FA ở routes/web.php.

use App\Http\Controllers\SuperAdmin\AiAnalyticsController;
use Illuminate\Support\Facades\Route;

Route::get('/ai_analytics', [AiAnalyticsController::class, 'index']);
