<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\Contracts\Ports\UnitOfWork;
use App\Agent\ValueObjects\AgentNotice;
use App\Agent\ValueObjects\AutoReplyStop;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\DeliveryFailure;
use App\Agent\ValueObjects\HandoffReason;
use App\Agent\ValueObjects\Handover;
use Psr\Log\LoggerInterface;

// Bảng ánh xạ DUY NHẤT từ lý do sang đường lui; thành phần khác chỉ trả lý do.
//   LoopCap, TurnFailed, ModelRefused, TextOnly → ghi chú riêng + chuyển thủ công (lượt lỗi)
//   GuardFailed (hoặc lượt lỗi sau khi rào luật 19 đã từ chối) → câu giữ chân chuẩn + bàn giao
//   WindowClosed → ghi chú riêng
// Ghi chú không nhắc tên ai.
final class Dispositions
{
    private const ABANDONING_FAILURES = [DeliveryFailure::FloorLost, DeliveryFailure::AutoResponderOff];

    public function __construct(
        private readonly ConversationActionWriter $writer,
        private readonly UnitOfWork $unitOfWork,
        private readonly LoggerInterface $logger,
    ) {}

    public function fallBack(FallbackReason $reason, ConversationRef $conversation, int $aiAgentId, ?string $customerQuestion, bool $sawUnsourcedClaim): TurnEnd
    {
        $effective = $sawUnsourcedClaim && in_array($reason, [FallbackReason::LoopCap, FallbackReason::TextOnly], true)
            ? FallbackReason::GuardFailed
            : $reason;

        $this->logger->info('agent.turn.fallback', ['reason' => $effective->value, 'conversation_id' => $conversation->conversationId]);

        match ($effective) {
            FallbackReason::WindowClosed => $this->writer->postNotice($conversation, $aiAgentId, AgentNotice::WindowClosed),
            FallbackReason::GuardFailed => $this->holdAndHandOver($conversation, $aiAgentId, $customerQuestion),
            FallbackReason::LoopCap, FallbackReason::TurnFailed, FallbackReason::ModelRefused, FallbackReason::TextOnly => $this->stopAfterFailure($conversation, $aiAgentId),
        };

        return TurnEnd::FellBack;
    }

    public function stopAfterFailure(ConversationRef $conversation, int $aiAgentId): void
    {
        $this->unitOfWork->run(function () use ($conversation, $aiAgentId) {
            $this->writer->postNotice($conversation, $aiAgentId, AgentNotice::TurnFailed);
            $this->writer->disableAutoResponder($conversation, $aiAgentId, AutoReplyStop::TurnFailed);
        });
    }

    private function holdAndHandOver(ConversationRef $conversation, int $aiAgentId, ?string $customerQuestion): void
    {
        $this->unitOfWork->run(function () use ($conversation, $aiAgentId, $customerQuestion) {
            $holding = $this->writer->sendStandardHoldingReply($conversation, $aiAgentId);

            if (! $holding->isDelivered() && in_array($holding->failure, self::ABANDONING_FAILURES, true)) {
                return;
            }

            $this->writer->handOver($conversation, $aiAgentId, new Handover(HandoffReason::BindingInfoMissing, null, $customerQuestion));
        });
    }
}
