<?php

// Nhật ký AI trong console quản trị: mỗi lần gọi mô hình một dòng `api_logs`, chỉ đọc.
// Nạp bên trong nhóm /admin đã qua auth:super_admin + bắt buộc 2FA ở routes/web.php.

use App\Http\Controllers\SuperAdmin\AiLogsController;
use Illuminate\Support\Facades\Route;

Route::get('/ai_logs', [AiLogsController::class, 'index']);
