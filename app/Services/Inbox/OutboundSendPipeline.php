<?php

namespace App\Services\Inbox;

use App\Contracts\SendException;
use App\Exceptions\QuotaExceededException;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Integration\Contracts\ChannelDriver;
use App\Services\MeteringService;

/**
 * P11 (BLK-4) — MONEY-PATH dùng chung mọi kênh, hoist TRƯỚC khi đóng băng contract.
 *
 * Luật bất biến (nền monetization — KHÔNG kênh nào được vòng qua):
 *  1. Quota per-channel gate TRƯỚC transport (assertCanSend — F1, conv mới + hết
 *     quota → QuotaExceededException, KHÔNG gọi driver).
 *  2. meterReply SAU transport thành công (chỉ đếm khi tenant trả lời — F14;
 *     inbound KHÔNG BAO GIỜ qua đây — F13/F20 ở InboundMessageService).
 *  3. Publish SAU cùng (cache hội thoại + broadcast MessageReceived) — tab người
 *     gửi append tại chỗ, đồng nghiệp thấy realtime, stream_version sync (P09).
 *     Fail-safe: tin ĐÃ đi platform → lỗi publish không được ném ra user.
 *
 * Driver chỉ lo POLICY kênh (giờ/cap ToS) + TRANSPORT + persist. Circuit-breaker,
 * echo-dedup, SendRateLimiter, outbox retry = đặc thù kênh, GIỮ trong driver.
 * Contract test (ChannelFrameworkContractTest) chạm money-path THẬT qua đây.
 */
class OutboundSendPipeline
{
    public function __construct(
        private readonly MeteringService $meteringService,
        private readonly MessagePublisher $messagePublisher,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     *
     * @throws QuotaExceededException hết quota hội thoại mới (per-channel)
     * @throws SendException policy/transport kênh từ chối
     */
    public function send(ChannelDriver $driver, Conversation $conversation, array $payload): Message
    {
        // 1. Quota per-channel (core) — chặn TRƯỚC khi driver chạm platform
        $this->meteringService->assertCanSend($conversation);

        // 2. Policy kênh + transport + persist (driver-owned)
        $message = $driver->sendMessage($conversation, $payload);

        // 3. Đếm reply (per-channel) — chỉ khi transport đã thành công
        $this->meteringService->meterReply($conversation);

        // 4. Cache hội thoại + broadcast — fail-safe: tin đã đi platform thành công
        try {
            $this->messagePublisher->publish($conversation, $message, 'out');
        } catch (\Throwable $e) {
            report($e);
        }

        return $message;
    }
}
