<?php

namespace App\Agent\Boundary\Writers;

use App\Agent\Boundary\CoreRecords;
use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\ValueObjects\AgentNotice;
use App\Agent\ValueObjects\AutoReplyStop;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\DeliveryFailure;
use App\Agent\ValueObjects\DeliveryReceipt;
use App\Agent\ValueObjects\Handover;
use App\Builders\Messages\MessageBuilder;
use App\Exceptions\Conversations\ConversationFloorHeld;
use App\Exceptions\RecordInvalidException;
use App\Models\AiAgent;
use App\Models\Conversation;
use App\Services\Conversations\AutoResponderStopReason;
use App\Services\Conversations\ConversationAutoResponder;

// Ghi vào hội thoại của lõi đứng tên AI agent, qua đúng một đường tạo tin của lõi
// (MessageBuilder). Lõi chỉ chặn tin công khai khi người khác giữ lượt; AI nói khi
// công tắc đã tắt hay khi không còn là AI của inbox thì phải chặn ở đây.
final class CoreConversationActionWriter implements ConversationActionWriter
{
    private const LANG = 'ai_agent_turns';

    // Khoá giao diện đọc để hiện ghi chú bàn giao (nút tiếp nhận, thêm câu trả lời mẫu).
    private const HANDOFF_ATTRIBUTE = 'ai_handoff';

    public function __construct(private readonly ConversationAutoResponder $autoResponder) {}

    public function sendReply(ConversationRef $conversation, int $aiAgentId, string $text): DeliveryReceipt
    {
        [$model, $aiAgent] = $this->locate($conversation, $aiAgentId);

        if ($model === null || $aiAgent === null) {
            return DeliveryReceipt::failed(DeliveryFailure::Rejected);
        }

        if (! $model->ai_auto_reply || $model->inbox->replyingAiAgent()->value('id') !== $aiAgent->id) {
            return DeliveryReceipt::failed(DeliveryFailure::AutoResponderOff);
        }

        if (! $model->canReply()) {
            return DeliveryReceipt::failed(DeliveryFailure::WindowClosed);
        }

        try {
            return DeliveryReceipt::delivered((new MessageBuilder($aiAgent, $model, ['content' => $text]))->perform()->id);
        } catch (ConversationFloorHeld) {
            return DeliveryReceipt::failed(DeliveryFailure::FloorLost);
        } catch (RecordInvalidException) {
            return DeliveryReceipt::failed(DeliveryFailure::Rejected);
        }
    }

    public function postNotice(ConversationRef $conversation, int $aiAgentId, AgentNotice $notice): DeliveryReceipt
    {
        [$model, $aiAgent] = $this->locate($conversation, $aiAgentId);

        if ($model === null) {
            return DeliveryReceipt::failed(DeliveryFailure::Rejected);
        }

        $text = $model->inAccountLocale(fn () => __(self::LANG.".notices.{$notice->value}", ['agent' => $aiAgent?->name ?? 'AI']));

        return $this->privateNote($model, $aiAgent, $text);
    }

    public function handOver(ConversationRef $conversation, int $aiAgentId, Handover $handover): DeliveryReceipt
    {
        [$model, $aiAgent] = $this->locate($conversation, $aiAgentId);

        if ($model === null) {
            return DeliveryReceipt::failed(DeliveryFailure::Rejected);
        }

        $text = $model->inAccountLocale(function () use ($aiAgent, $handover) {
            $title = __(self::LANG.'.handover.title', [
                'agent' => $aiAgent?->name ?? 'AI',
                'reason' => __(self::LANG.".handover.reasons.{$handover->reason->value}"),
            ]);

            return $title."\n".($handover->note ?? __(self::LANG.'.handover.default_note'));
        });

        $receipt = $this->privateNote($model, $aiAgent, $text, [
            self::HANDOFF_ATTRIBUTE => ['reason' => $handover->reason->value, 'question' => $handover->customerQuestion],
        ]);

        if ($receipt->isDelivered()) {
            $this->autoResponder->disable($model, AutoResponderStopReason::HandedOff);
        }

        return $receipt;
    }

    public function disableAutoResponder(ConversationRef $conversation, int $aiAgentId, AutoReplyStop $reason): void
    {
        $model = CoreRecords::conversation($conversation);

        if ($model === null) {
            return;
        }

        $this->autoResponder->disable($model, match ($reason) {
            AutoReplyStop::TurnFailed => AutoResponderStopReason::AiTurnFailed,
            AutoReplyStop::AgentStopped => AutoResponderStopReason::AiAgentStopped,
        });
    }

    /** @param array<string, mixed> $trustedAttributes */
    private function privateNote(Conversation $conversation, ?AiAgent $aiAgent, string $text, array $trustedAttributes = []): DeliveryReceipt
    {
        try {
            $message = (new MessageBuilder($aiAgent, $conversation, ['content' => $text, 'private' => true], trustedContentAttributes: $trustedAttributes))->perform();

            return DeliveryReceipt::delivered($message->id);
        } catch (RecordInvalidException) {
            return DeliveryReceipt::failed(DeliveryFailure::Rejected);
        }
    }

    /** @return array{0: ?Conversation, 1: ?AiAgent} */
    private function locate(ConversationRef $conversation, int $aiAgentId): array
    {
        return [CoreRecords::conversation($conversation), CoreRecords::aiAgent($conversation->accountId, $aiAgentId)];
    }
}
