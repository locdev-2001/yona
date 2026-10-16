<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\ConversationSnapshot;
use App\Agent\ValueObjects\CoreMessage;

interface ConversationReader
{
    // null khi hội thoại không tồn tại trong account đó.
    public function conversation(ConversationRef $conversation): ?ConversationSnapshot;

    /**
     * Tin lõi theo thứ tự hội thoại, gồm cả ghi chú riêng và dòng hoạt động.
     * $afterMessageId null = $limit tin gần nhất (bootstrap).
     *
     * @return list<CoreMessage>
     */
    public function messagesAfter(ConversationRef $conversation, ?int $afterMessageId, int $limit): array;

    /** @return list<string> tên các nhãn của account, theo thứ tự hiển thị */
    public function labels(int $accountId): array;
}
