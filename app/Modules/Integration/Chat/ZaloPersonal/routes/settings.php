<?php

use App\Http\Controllers\Integration\ZaloConnectionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Channel Zalo — Settings Routes (QR connect / list / logout)
|--------------------------------------------------------------------------
|
| Web routes cho UI quản lý kết nối Zalo cá nhân.
| Middleware: web + auth + workspace. Gate tenant.zalo.manage trong controller.
|
| ponytail: giữ tên route settings.zalo.* + path settings/zalo-connections
| ở 2c — đổi path → integrations/zalo ở 2f (cùng nav + bỏ Zalo Settings).
|
| @see \App\Http\Controllers\Integration\ZaloConnectionController
|
*/

Route::middleware(['web', 'auth', 'workspace'])
    ->prefix('settings')
    ->name('settings.zalo.')
    ->group(function () {
        Route::controller(ZaloConnectionController::class)
            ->prefix('zalo-connections')
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::post('/', 'store')->name('store');
                Route::get('/qr-status', 'qr')->name('qr');
                Route::post('/promote', 'promote')->name('promote');
                Route::delete('/{zaloConnection}', 'destroy')->name('destroy');
            });
    });
