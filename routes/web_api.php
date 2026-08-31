<?php

use App\Http\Controllers\WebApi\ProfileAvailabilityController;
use Illuminate\Support\Facades\Route;

// Mặt tiền web_api: JSON cho chính FE (session auth) — map path /api/v1
// như dashboard API của Chatwoot (quyết định #3).
Route::middleware(['auth', 'account.scope'])
    ->prefix('/api/v1/accounts/{account}')
    ->whereNumber('account')
    ->group(function () {
        Route::post('/profile/availability', [ProfileAvailabilityController::class, 'availability']);
        Route::post('/profile/auto_offline', [ProfileAvailabilityController::class, 'autoOffline']);
    });
