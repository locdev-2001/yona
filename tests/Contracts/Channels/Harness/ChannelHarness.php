<?php

namespace Tests\Contracts\Channels\Harness;

use App\Channels\Capability;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;

/**
 * Phần ĐẶC THÙ KÊNH của contract test: bơm payload thật của kênh vào và gọi driver
 * gửi ra. Lô Zalo nối vào bằng cách viết ZaloHarness (fixture tests/Fixtures/channels/
 * zalo_*.json + BridgeEventService/SendOnZaloService) rồi gọi ChannelContractRunner.
 */
interface ChannelHarness
{
    public function inbox(): Inbox;

    /** Hội thoại có sẵn để dựng tin đi (kênh tự chọn cách tạo cho đúng contact_inbox của mình). */
    public function conversation(): Conversation;

    /** Bơm một tin đến thật của kênh, trả về Message lõi đã dựng. */
    public function receiveInbound(Capability $capability): Message;

    /** Khách trích dẫn `$quoted` trong một tin chữ mới. */
    public function receiveReply(Message $quoted): Message;

    /** Gọi driver gửi $message ra kênh. */
    public function sendOutbound(Message $message): OutboundAttempt;

    /** Bơm một sự kiện trạng thái của kênh nhắm vào $target (đã giao / đã xem / cảm xúc / thu hồi). */
    public function receiveEvent(Capability $capability, Message $target): void;
}
