<?php

// Cảnh báo vận hành: luật ngưỡng, lịch sử sự cố, gửi thử, đăng ký thông báo đẩy
// của super admin. Nạp bên trong nhóm /admin đã qua auth:super_admin + bắt buộc 2FA
// ở routes/web.php; mọi request ghi tự vào nhật ký thao tác.

use App\Http\Controllers\SuperAdmin\AlertsController;
use Illuminate\Support\Facades\Route;

Route::get('/alerts', [AlertsController::class, 'index']);
Route::patch('/alerts/rules/{key}', [AlertsController::class, 'update'])->where('key', '[a-z0-9_]+');
Route::post('/alerts/test', [AlertsController::class, 'test'])->middleware('throttle:6,1');
Route::post('/api/push_subscriptions', [AlertsController::class, 'subscribe']);
Route::delete('/api/push_subscriptions', [AlertsController::class, 'unsubscribe']);
