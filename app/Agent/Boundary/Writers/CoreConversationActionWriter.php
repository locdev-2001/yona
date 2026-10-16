<?php

namespace App\Agent\Boundary\Writers;

use App\Agent\Boundary\CoreProducts;
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
use App\Models\PaymentAccount;
use App\Services\Conversations\AutoResponderStopReason;
use App\Services\Conversations\ConversationAutoResponder;

// Ghi vào hội thoại của lõi đứng tên AI agent, qua đúng một đường tạo tin của lõi
// (MessageBuilder) — chữ, thẻ sản phẩm, trả lời nhanh, chuyển khoản đều đi qua `send`.
// Lõi chỉ chặn tin công khai khi người khác giữ lượt; AI nói khi công tắc đã tắt hay khi
// không còn là AI của inbox thì phải chặn ở đây.
final class CoreConversationActionWriter implements ConversationActionWriter
{
    private const LANG = 'ai_agent_turns';

    // Khoá giao diện đọc để hiện ghi chú bàn giao (nút tiếp nhận, thêm câu trả lời mẫu).
    private const HANDOFF_ATTRIBUTE = 'ai_handoff';

    private const QUICK_REPLIES_CONTENT_TYPE = 'input_select';

    private const BANK_TRANSFER_CONTENT_TYPE = 'bank_transfer';

    public function __construct(private readonly ConversationAutoResponder $autoResponder) {}

    public function sendReply(ConversationRef $conversation, int $aiAgentId, string $text): DeliveryReceipt
    {
        return $this->send($conversation, $aiAgentId, ['content' => $text]);
    }

    public function sendProductCards(ConversationRef $conversation, int $aiAgentId, array $productIds, ?string $caption): DeliveryReceipt
    {
        $found = CoreProducts::find($conversation->accountId, $productIds);

        if ($productIds === [] || count($found) !== count(array_unique($productIds))) {
            return DeliveryReceipt::failed(DeliveryFailure::NotFound);
        }

        $items = [];

        foreach (array_column($found, 'item') as $item) {
            // Hai câu trả lời mẫu có thể cùng đặt id thẻ (`item-1`): id phải duy nhất trong một tin.
            $item['id'] = in_array($item['id'], array_column($items, 'id'), true) ? $item['id'].'-'.(count($items) + 1) : $item['id'];
            $items[] = $item;
        }

        return $this->send($conversation, $aiAgentId, [
            'content_type' => CoreProducts::CARDS_CONTENT_TYPE,
            'content' => $caption,
            'content_attributes' => ['items' => $items],
        ]);
    }

    public function sendQuickReplies(ConversationRef $conversation, int $aiAgentId, string $question, array $options): DeliveryReceipt
    {
        return $this->send($conversation, $aiAgentId, [
            'content_type' => self::QUICK_REPLIES_CONTENT_TYPE,
            'content' => $question,
            'content_attributes' => ['items' => array_map(fn (string $option) => ['title' => $option], $options)],
        ]);
    }

    public function sendPaymentRequest(ConversationRef $conversation, int $aiAgentId, int $amount, ?string $caption): DeliveryReceipt
    {
        // Chỉ tài khoản shop mở cho mọi nhân viên: lõi từ chối người gửi không phải người
        // với tài khoản còn lại. Ưu tiên tài khoản mặc định.
        $paymentAccountId = PaymentAccount::query()
            ->where('account_id', $conversation->accountId)
            ->where('allow_all_agents', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->value('id');

        if ($paymentAccountId === null) {
            return DeliveryReceipt::failed(DeliveryFailure::NotPermitted);
        }

        return $this->send($conversation, $aiAgentId, [
            'content_type' => self::BANK_TRANSFER_CONTENT_TYPE,
            'content' => $caption,
            'content_attributes' => ['payment_account_id' => $paymentAccountId, 'amount' => $amount],
        ]);
    }

    public function addNote(ConversationRef $conversation, int $aiAgentId, string $text): DeliveryReceipt
    {
        [$model, $aiAgent] = $this->locate($conversation, $aiAgentId);

        return $model === null ? DeliveryReceipt::failed(DeliveryFailure::Rejected) : $this->privateNote($model, $aiAgent, $text);
    }

    public function addLabels(ConversationRef $conversation, array $labels): ?array
    {
        $model = CoreRecords::conversation($conversation);

        if ($model === null) {
            return null;
        }

        $model->addLabels($labels);

        return $model->labelList();
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

    /**
     * Tin công khai cho khách; chỉ AI trả lời của inbox, khi công tắc còn bật, cửa sổ
     * kênh còn mở và lượt còn giữ quyền nói.
     *
     * @param  array<string, mixed>  $params
     */
    private function send(ConversationRef $conversation, int $aiAgentId, array $params): DeliveryReceipt
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
            return DeliveryReceipt::delivered((new MessageBuilder($aiAgent, $model, $params))->perform()->id);
        } catch (ConversationFloorHeld) {
            return DeliveryReceipt::failed(DeliveryFailure::FloorLost);
        } catch (RecordInvalidException) {
            return DeliveryReceipt::failed(DeliveryFailure::Rejected);
        }
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
