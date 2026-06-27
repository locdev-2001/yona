<?php

use Illuminate\Support\Facades\Route;
use Modules\ChannelZalo\Http\Controllers\ZaloPersonalWebhookController;

/*
|--------------------------------------------------------------------------
| Channel Zalo — API Routes
|--------------------------------------------------------------------------
|
| Webhook receiver từ Zalo personal bridge.
|
| Middleware: zalo.bridge.secret (VerifyZaloBridgeSecret — hash_equals HMAC)
| Không có: auth, session, CSRF (bridge → server, không phải browser).
|
| RLS bind xảy ra TRONG controller (không qua middleware web/tenant).
| @see ZaloPersonalWebhookController
|
*/

Route::post('integrations/zalo-personal/webhook', ZaloPersonalWebhookController::class)
    ->middleware('zalo.bridge.secret')
    ->name('zalo.webhook');
