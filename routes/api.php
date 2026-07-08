<?php

use App\Http\Controllers\Integration\ZaloPersonalWebhookController;
use Illuminate\Support\Facades\Route;

// Zalo personal bridge webhook (HMAC-authed; no session/CSRF). Toggle via config/integrations.php.
if (config('integrations.zalo_personal.enabled')) {
    Route::post('integrations/zalo-personal/webhook', ZaloPersonalWebhookController::class)
        ->middleware('zalo.bridge.secret')
        ->name('zalo.webhook');
}
