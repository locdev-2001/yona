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

    private const TELEGRAM_BASE_URL = 'https://api.telegram.org';

    /** Không bao giờ ném lỗi ra ngoài — một alert hỏng không được phép làm hỏng luồng đang gọi nó (vd JobFailed listener). */
    public function send(string $signature, string $message): void
    {
        try {
            $this->attemptSend($signature, $message);
        } catch (Throwable $e) {
            Log::error('[ALERT] OpsAlerter::send thất bại: '.$e->getMessage());
        }
    }

    private function attemptSend(string $signature, string $message): void
    {
        $throttleKey = "ops-alert:throttle:{$signature}";
        $suppressedKey = "ops-alert:suppressed:{$signature}";

        // Cache::add tự atomic (set-if-absent) — has()+put() riêng lẻ có race khi
        // nhiều worker cùng lỗi một lúc, tất cả đều pass has() rồi đều gửi.
        if (! Cache::add($throttleKey, true, self::THROTTLE_SECONDS)) {
            Cache::add($suppressedKey, 0, self::THROTTLE_SECONDS * 4);
            Cache::increment($suppressedKey);

            return;
        }

        $suppressed = (int) Cache::pull($suppressedKey, 0);

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

        try {
            Http::asForm()
                ->timeout(3)
                ->post(self::TELEGRAM_BASE_URL."/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $message,
                ])
                ->throw();
        } catch (Throwable $e) {
            // Guzzle nối " for <uri>" vào message khi timeout/connect lỗi, và URI chứa
            // token bot (/bot{token}/sendMessage) — không bao giờ để token lọt vào log.
            Log::error('[ALERT] Gửi Telegram thất bại, rơi về log: '.str_replace($token, '***', $e->getMessage()));
            Log::warning('[ALERT] '.$message);
        }
    }
}
