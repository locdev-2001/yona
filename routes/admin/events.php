<?php

// Sự kiện sản phẩm trong console quản trị: mức dùng tính năng theo account.
// Nạp bên trong nhóm /admin đã qua auth:super_admin + bắt buộc 2FA ở routes/web.php.

use App\Http\Controllers\SuperAdmin\FeatureUsageController;
use Illuminate\Support\Facades\Route;

Route::get('/feature_usage', [FeatureUsageController::class, 'index']);
Route::get('/feature_usage/{name}', [FeatureUsageController::class, 'show'])->where('name', '[a-z_]+');
