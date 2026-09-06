<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\TelegramEventsJob;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ refs/chatwoot/app/controllers/webhooks/telegram_controller.rb.
// Xác thực: bot_token nằm trong URL (đúng cách Chatwoot đăng ký webhook).
class TelegramController extends Controller
{
    public function processPayload(Request $request, string $botToken): Response
    {
        TelegramEventsJob::dispatch(['bot_token' => $botToken, 'telegram' => $request->all()]);

        return response('', 200);
    }
}
