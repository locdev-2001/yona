<?php

namespace App\Services\Channels;

use App\Models\Conversation;
use App\Models\Message;

/**
 * Hành động agent làm TRÊN kênh ngoài mà không phải "gửi một tin mới":
 * thả/gỡ biểu cảm, thu hồi tin, báo đang gõ (docs/channel-capabilities.md §2.2
 * `outbound_reaction` / `outbound_recall` / `outbound_typing`).
 *
 * Lõi (controller, endpoint) chỉ hỏi `Inbox::supports()` rồi gọi qua contract này;
 * mọi đặc thù nền tảng (mã cảm xúc, cliMsgId, nhiều msgId cho một tin) sống trong
 * driver của kênh. Thêm kênh = thêm driver + một dòng trong ChannelActionRegistry.
 *
 * Driver chỉ bị gọi tới những hành động kênh ĐÃ KHAI BÁO; hành động không khai
 * được phép ném LogicException.
 */
interface ChannelOutboundActions
{
    /**
     * Thả biểu cảm (`$emoji`) hoặc gỡ (`$emoji = null`) trên tin đã có ở kênh.
     *
     * @return array{ok: bool, code?: string, message?: string}
     */
    public function reaction(Message $message, ?string $emoji): array;

    /**
     * Thu hồi tin ở phía kênh. Thất bại ⇒ lõi GIỮ NGUYÊN tin (không đánh dấu xoá
     * một chiều) và hiện lý do.
     *
     * @return array{ok: bool, code?: string, message?: string}
     */
    public function recall(Message $message): array;

    /** Báo cho khách biết agent đang gõ. Tự giới hạn nhịp trong driver. */
    public function typing(Conversation $conversation): void;
}
