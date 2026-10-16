<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\ConversationFloor;
use App\Agent\Contracts\Ports\ConversationReader;
use Psr\Log\LoggerInterface;

// Job lượt hỏng (lỗi bất ngờ, quá giờ, chờ khoá quá hạn). Lượt đã bắt đầu thì nhả quyền
// nói và để lại ghi chú lượt lỗi, không gửi gì cho khách. Job chưa bắt đầu lượt (chỉ hết
// hạn chờ khoá hội thoại, lượt khác có thể đang giữ quyền nói) thì chỉ ghi log.
final class TurnFailureHandler
{
    public function __construct(
        private readonly ConversationReader $reader,
        private readonly ConversationFloor $floor,
        private readonly TurnJobMark $jobMark,
        private readonly Dispositions $dispositions,
        private readonly TurnTally $tally,
        private readonly LoggerInterface $logger,
    ) {}

    public function handle(TurnOrder $order, string $jobKey): void
    {
        $started = $this->jobMark->claimed($jobKey);

        $this->logger->warning('agent.turn.job_failed', [
            'conversation_id' => $order->conversationId,
            'wake_message_id' => $order->wakeMessageId,
            'turn_started' => $started,
        ]);

        if (! $started) {
            return;
        }

        $conversation = $order->conversation();
        $aiAgentId = $this->reader->conversation($conversation)?->aiAgentId;
        $this->floor->release($conversation);

        if ($aiAgentId !== null) {
            $this->tally->crashed($conversation->accountId, $aiAgentId);
            $this->dispositions->stopAfterFailure($conversation, $aiAgentId);
        }
    }
}
