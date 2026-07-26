<?php

namespace App\Services\Inbox;

use App\Contracts\SendException;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Port\ChannelDriver;
use App\Modules\Integration\Data\OutboundMessage;
use App\Services\MeteringService;

/**
 * Đường gửi outbound DUY NHẤT, dùng chung mọi kênh và mọi nguồn gửi.
 *
 * Inbox, automation, và bất cứ thứ gì sau này đều đi qua đây. Gọi thẳng
 * driver->sendMessage() là đi vòng qua thống kê và broadcast — đó chính là cách
 * automation từng gửi tin rỗng mà không ai đếm được.
 *
 * Thứ tự cố định:
 *  1. Policy kênh + transport + persist (driver-owned).
 *  2. meterReply — thống kê per-channel, CHỈ sau khi transport thành công, cho
 *     MỌI nguồn gửi. Tin inbound không bao giờ đi qua đây (F13/F20 ở
 *     InboundMessageService).
 *  3. Publish (cache hội thoại + broadcast MessageReceived) — tab người gửi
 *     append tại chỗ, đồng nghiệp thấy realtime, stream_version sync.
 *     Fail-safe: tin ĐÃ đi platform → lỗi publish không được ném ra user.
 *
 * KHÔNG có gate hạn mức: dùng không giới hạn, chỉ thống kê (quyết định founder
 * 25/07/2026). Muốn dựng lại gate sau này thì thêm một lớp policy đứng TRƯỚC
 * bước 1 và đọc số liệu từ MeteringService — đừng nhét điều kiện chặn vào bộ đếm.
 *
 * Driver chỉ lo POLICY kênh (giờ/cap ToS) + TRANSPORT + persist. Circuit-breaker,
 * echo-dedup, SendRateLimiter, outbox retry = đặc thù kênh, GIỮ trong driver.
 */
class OutboundSendPipeline
{
    public function __construct(
        private readonly MeteringService $meteringService,
        private readonly MessagePublisher $messagePublisher,
    ) {}

    /**
     * @throws SendException policy/transport kênh từ chối
     */
    public function send(ChannelDriver $driver, Conversation $conversation, OutboundMessage $message): Message
    {
        $sent = $driver->sendMessage($conversation, $message->toArray());

        $this->meteringService->meterReply($conversation);

        try {
            $this->messagePublisher->publish($conversation, $sent, 'out');
        } catch (\Throwable $e) {
            report($e);
        }

        return $sent;
    }
}
