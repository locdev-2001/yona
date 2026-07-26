<?php

use App\Http\Controllers\Chat\WidgetInboundController;
use App\Http\Controllers\Chat\ZaloPersonal\ZaloPersonalWebhookController;
use Illuminate\Support\Facades\Route;

// Zalo personal bridge webhook (HMAC-authed; no session/CSRF). Toggle via config/integrations.php.
if (config('integrations.zalo_personal.enabled')) {
    Route::post('integrations/zalo-personal/webhook', ZaloPersonalWebhookController::class)
        ->middleware('zalo.bridge.secret')
        ->name('zalo.webhook');
}

// Kênh nội bộ — transport riêng của kênh, KHÔNG phải API sản phẩm cho bên thứ ba
// (cái đó là /api/v1 ở P6). Không có cờ config: kênh nội bộ luôn bật.
Route::post('channels/widget/inbound', WidgetInboundController::class)
    ->middleware('widget.channel.secret')
    ->name('channels.widget.inbound');
