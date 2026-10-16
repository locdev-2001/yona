<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\Contracts\Ports\EphemeralStore;
use App\Agent\ValueObjects\AgentNotice;
use App\Agent\ValueObjects\ConversationRef;
use Carbon\CarbonImmutable;

// Ghi chú lặp theo tình trạng (hết ngân sách, cửa sổ kênh đã đóng): mỗi loại tối đa
// một lần mỗi hội thoại mỗi ngày, ngày tính theo múi giờ của inbox.
final class DailyNotice
{
    private const TTL_SECONDS = 2 * 86_400;

    public function __construct(
        private readonly ConversationActionWriter $writer,
        private readonly EphemeralStore $store,
    ) {}

    public function post(ConversationRef $conversation, int $aiAgentId, AgentNotice $notice, string $timezone): void
    {
        $day = CarbonImmutable::now($timezone)->format('Y-m-d');

        if ($this->store->add("notice:{$notice->value}:{$conversation->conversationId}:{$day}", 1, self::TTL_SECONDS)) {
            $this->writer->postNotice($conversation, $aiAgentId, $notice);
        }
    }
}
