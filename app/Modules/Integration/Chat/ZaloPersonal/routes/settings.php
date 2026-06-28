<?php

use App\Http\Controllers\Integration\ZaloConnectionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Channel Zalo — Integration Routes (QR connect / list / logout)
|--------------------------------------------------------------------------
|
| Web routes cho UI quản lý kết nối Zalo cá nhân.
| Middleware: web + auth + workspace. Gate tenant.zalo.manage trong controller.
|
| @see \App\Http\Controllers\Integration\ZaloConnectionController
|
*/

Route::middleware(['web', 'auth', 'workspace'])
    ->prefix('integrations')
    ->name('integrations.zalo.')
    ->group(function () {
        Route::controller(ZaloConnectionController::class)
            ->prefix('zalo')
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::post('/', 'store')->name('store');
                Route::get('/qr-status', 'qr')->name('qr');
                Route::post('/promote', 'promote')->name('promote');
                Route::delete('/{zaloConnection}', 'destroy')->name('destroy');
            });
    });
