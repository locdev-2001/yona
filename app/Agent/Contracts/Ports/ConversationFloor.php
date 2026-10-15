<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\ConversationRef;
use DateTimeImmutable;

// Quyền nói công khai trên hội thoại. Chỉ AI agent đang đảm nhận hội thoại giữ được;
// lõi đặt trần thời gian giữ. Phải nhả ở mọi đường kết thúc lượt; nhả không cần AI còn
// đảm nhận hội thoại (AI có thể vừa bị tắt, xoá hay thay giữa lượt).
interface ConversationFloor
{
    // false khi AI agent không còn đảm nhận hội thoại (công tắc đã tắt hoặc đổi).
    public function acquire(ConversationRef $conversation, int $aiAgentId, DateTimeImmutable $until): bool;

    public function release(ConversationRef $conversation): void;

    public function heldUntil(ConversationRef $conversation): ?DateTimeImmutable;
}
