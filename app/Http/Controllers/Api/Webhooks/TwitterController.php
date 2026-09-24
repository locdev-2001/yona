<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Webhook Twitter (CRC + sự kiện). CHỈ khung: CRC trả lời đúng để Twitter giữ đăng ký webhook;
 * xử lý sự kiện DM chưa port (xem note F2-F5).
 */
class TwitterController extends Controller
{
    public function crc(Request $request): JsonResponse
    {
        $token = (string) $request->query('crc_token');
        $secret = (string) config('services.twitter.consumer_secret');

        return response()->json([
            'response_token' => 'sha256='.base64_encode(hash_hmac('sha256', $token, $secret, true)),
        ]);
    }

    public function events(Request $request): Response
    {
        return response('', 200);
    }
}
