<?php

namespace App\Support\Alerts;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Kênh cảnh báo vận hành duy nhất (job lỗi, Horizon/Reverb/zalo-bridge chết,
 * restore drill hỏng). Gửi Telegram khi có cấu hình, rơi về log khi chưa —
 * KHÔNG BAO GIỜ được chặn luồng chính vì lỗi mạng khi gửi cảnh báo.
 *
 * Cấm truyền số điện thoại, nội dung tin nhắn hay bất kỳ dữ liệu khách hàng nào
 * vào $message — chỉ id/mã lỗi/số đếm.
 *
 * Dedup theo $signature: tối đa 1 tin/15 phút mỗi chữ ký, để một cơn bão job
 * lỗi (vd 20 lần liên tiếp) chỉ ra đúng một tin Telegram thay vì làm ngập kênh.
 * Số lần bị gộp trong cửa sổ trước hiện ở tin kế tiếp sau khi cửa sổ đó hết,
 * thay vì sửa lại tin Telegram cũ (đơn giản hơn, không thêm bề mặt lỗi của
 * việc gọi editMessageText).
 */
class OpsAlerter
{
    private const THROTTLE_SECONDS = 900;

    public function send(string $signature, string $message): void
    {
        $throttleKey = "ops-alert:throttle:{$signature}";
        $suppressedKey = "ops-alert:suppressed:{$signature}";

        if (Cache::has($throttleKey)) {
            Cache::increment($suppressedKey);

            return;
        }

        $suppressed = (int) Cache::pull($suppressedKey, 0);
        Cache::put($throttleKey, true, self::THROTTLE_SECONDS);

        if ($suppressed > 0) {
            $message .= " (đã gộp thêm {$suppressed} lần lặp lại trong 15 phút trước)";
        }

        $this->dispatch($message);
    }

    private function dispatch(string $message): void
    {
        $token = (string) config('services.alert_telegram.bot_token');
        $chatId = (string) config('services.alert_telegram.chat_id');

        if ($token === '' || $chatId === '') {
            Log::warning('[ALERT] '.$message);

            return;
        }

        $baseUrl = rtrim((string) config('services.alert_telegram.base_url', 'https://api.telegram.org'), '/');

        try {
            Http::asForm()
                ->timeout(10)
                ->post("{$baseUrl}/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $message,
                ])
                ->throw();
        } catch (Throwable $e) {
            Log::error('[ALERT] Gửi Telegram thất bại, rơi về log: '.$e->getMessage());
            Log::warning('[ALERT] '.$message);
        }
    }
}
