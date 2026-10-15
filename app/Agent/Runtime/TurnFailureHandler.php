<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\ConversationFloor;
use App\Agent\Contracts\Ports\ConversationReader;
use Psr\Log\LoggerInterface;

// Job lượt hỏng (lỗi bất ngờ, quá giờ, chờ khoá quá hạn): nhả quyền nói và để lại ghi
// chú lượt lỗi. Không gửi gì cho khách.
final class TurnFailureHandler
{
    public function __construct(
        private readonly ConversationReader $reader,
        private readonly ConversationFloor $floor,
        private readonly Dispositions $dispositions,
        private readonly LoggerInterface $logger,
    ) {}

    public function handle(TurnOrder $order): void
    {
        $conversation = $order->conversation();
        $aiAgentId = $this->reader->conversation($conversation)?->aiAgentId;

        $this->logger->warning('agent.turn.job_failed', ['conversation_id' => $order->conversationId, 'wake_message_id' => $order->wakeMessageId]);

        if ($aiAgentId === null) {
            return;
        }

        $this->floor->release($conversation, $aiAgentId);
        $this->dispositions->stopAfterFailure($conversation, $aiAgentId);
    }
}
