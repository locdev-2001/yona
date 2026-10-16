<?php

namespace App\Agent\Boundary\Evals;

use App\Agent\Evals\EvalShop;
use App\Agent\Evals\HistoryLine;
use App\Agent\Evals\Speaker;
use App\Agent\Evals\TranscriptLine;
use App\Builders\ContactInboxWithContactBuilder;
use App\Builders\ConversationBuilder;
use App\Builders\Messages\MessageBuilder;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\AiAgent;
use App\Models\ApiLog;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Conversations\ConversationAutoResponder;
use DateTimeImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

// Hội thoại của bộ chấm trên shop mẫu, đi đúng đường của lõi: khách mới qua builder liên
// hệ + hội thoại, tin khách `incoming` qua MessageBuilder như widget, công tắc AI qua
// ConversationAutoResponder. Đọc lại kết quả từ `messages` và `api_logs`.
final class EvalConversations
{
    // Dấu trong additional_attributes của hội thoại: kịch bản nào tạo ra nó.
    public const SCENARIO_ATTRIBUTE = 'agent_eval_scenario';

    private const HANDOFF_ATTRIBUTE = 'ai_handoff';

    public function __construct(
        private readonly ConversationAutoResponder $autoResponder,
        private readonly StructuredTypeRegistry $structuredTypes,
    ) {}

    /**
     * Khách mới, hội thoại mới; đoạn lịch sử (nếu có) dựng lùi ngày khi AI còn tắt, rồi
     * mới bật AI tự động để chỉ tin khách của kịch bản đánh thức AI.
     *
     * @param  list<HistoryLine>  $history
     */
    public function open(EvalShop $shop, string $scenarioId, string $customerName, array $history): int
    {
        $inbox = Inbox::query()->where('account_id', $shop->accountId)->findOrFail($shop->inboxId);
        $clockBefore = Carbon::getTestNow();
        $startedAt = Carbon::now();

        try {
            if ($history !== []) {
                Carbon::setTestNow($this->historyMoment($startedAt, $history[0]));
            }

            $conversation = $this->newConversation($inbox, $scenarioId, $customerName);

            foreach ($history as $line) {
                Carbon::setTestNow($this->historyMoment($startedAt, $line));
                $this->writeHistory($shop, $conversation, $line);
            }
        } finally {
            Carbon::setTestNow($clockBefore);
        }

        $this->autoResponder->enable($conversation->fresh());

        return $conversation->id;
    }

    public function customerSays(EvalShop $shop, int $conversationId, string $text): int
    {
        return (new MessageBuilder(
            user: null,
            conversation: $this->conversation($shop, $conversationId),
            params: ['content' => $text, 'message_type' => 'incoming'],
            incomingAllowed: true,
        ))->perform()->id;
    }

    /** @return list<TranscriptLine> tin sau $afterMessageId theo thứ tự id, gồm cả ghi chú và sự kiện */
    public function linesAfter(EvalShop $shop, int $conversationId, int $afterMessageId): array
    {
        $lines = [];
        $messages = $this->conversation($shop, $conversationId)
            ->messages()
            ->with(['sender', 'conversation.account'])
            ->where('id', '>', $afterMessageId)
            ->reorder()
            ->orderBy('id')
            ->get();

        foreach ($messages as $message) {
            $line = $this->line($message);

            if ($line !== null) {
                $lines[] = $line;
            }
        }

        return $lines;
    }

    public function autoReplyOn(EvalShop $shop, int $conversationId): bool
    {
        return (bool) $this->conversation($shop, $conversationId)->ai_auto_reply;
    }

    public function displayId(EvalShop $shop, int $conversationId): int
    {
        return (int) $this->conversation($shop, $conversationId)->display_id;
    }

    /** @return array{cost_micro_usd: int, calls: int, latency_ms: int} lời gọi mô hình của AI được đo trên hội thoại */
    public function aiModelCalls(EvalShop $shop, int $conversationId): array
    {
        $totals = ApiLog::query()
            ->where('account_id', $shop->accountId)
            ->where('conversation_id', $conversationId)
            ->where('ai_agent_id', $shop->aiAgentId)
            ->selectRaw('coalesce(sum(cost_micro_usd), 0) as cost, count(*) as calls, coalesce(sum(latency_ms), 0) as latency')
            ->toBase()
            ->first();

        return [
            'cost_micro_usd' => (int) ($totals->cost ?? 0),
            'calls' => (int) ($totals->calls ?? 0),
            'latency_ms' => (int) ($totals->latency ?? 0),
        ];
    }

    // Xoá mọi hội thoại và khách của account shop mẫu (account chỉ dùng cho eval).
    public function purge(EvalShop $shop): int
    {
        $removed = 0;

        Conversation::query()->where('account_id', $shop->accountId)->orderBy('id')->chunkById(100, function ($conversations) use (&$removed) {
            foreach ($conversations as $conversation) {
                $conversation->delete();
                $removed++;
            }
        });

        Contact::query()->where('account_id', $shop->accountId)->orderBy('id')->chunkById(100, function ($contacts) {
            foreach ($contacts as $contact) {
                $contact->delete();
            }
        });

        return $removed;
    }

    private function newConversation(Inbox $inbox, string $scenarioId, string $customerName): Conversation
    {
        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $inbox,
            contactAttributes: ['name' => $customerName],
            sourceId: (string) Str::uuid(),
        ))->perform() ?? throw new RuntimeException('Could not create the eval contact.');

        return (new ConversationBuilder([
            'additional_attributes' => [self::SCENARIO_ATTRIBUTE => $scenarioId],
        ], $contactInbox))->perform();
    }

    private function writeHistory(EvalShop $shop, Conversation $conversation, HistoryLine $line): void
    {
        $isCustomer = $line->speaker === 'customer';

        (new MessageBuilder(
            user: $isCustomer ? null : User::query()->findOrFail($shop->adminUserId),
            conversation: $conversation->fresh(),
            params: ['content' => $line->text, 'message_type' => $isCustomer ? 'incoming' : 'outgoing'],
            incomingAllowed: $isCustomer,
        ))->perform();
    }

    private function historyMoment(Carbon $startedAt, HistoryLine $line): Carbon
    {
        return $startedAt->copy()->subDays($line->daysAgo)->addMinutes($line->minutesAfter);
    }

    private function conversation(EvalShop $shop, int $conversationId): Conversation
    {
        return Conversation::query()->where('account_id', $shop->accountId)->findOrFail($conversationId);
    }

    private function line(Message $message): ?TranscriptLine
    {
        $speaker = $this->speaker($message);
        $text = $this->text($message);

        return $speaker === null || $text === '' ? null : new TranscriptLine(
            $message->id,
            $speaker,
            $text,
            DateTimeImmutable::createFromInterface($message->created_at),
        );
    }

    private function speaker(Message $message): ?Speaker
    {
        $sender = $message->sender;

        return match (true) {
            $message->isIncoming() => Speaker::Customer,
            $message->message_type === Message::TYPE_ACTIVITY => Speaker::Event,
            $sender instanceof AiAgent && $message->private => isset($message->content_attributes[self::HANDOFF_ATTRIBUTE]) ? Speaker::AiHandoffNote : Speaker::AiNotice,
            $sender instanceof AiAgent => Speaker::Ai,
            (bool) $message->private => null,
            default => Speaker::Staff,
        };
    }

    // Tin có cấu trúc (thẻ sản phẩm, chuyển khoản…) đọc thành chữ như kênh không có nút gốc.
    private function text(Message $message): string
    {
        $text = trim((string) $message->content);
        $contentType = $message->contentTypeName();
        $type = $contentType === 'text' ? null : $this->structuredTypes->for($contentType);

        if ($type === null) {
            return $text;
        }

        try {
            // Dựng chữ theo ngôn ngữ của account như khi gửi ra kênh, không theo ngôn ngữ của CLI.
            $plain = $message->conversation->inAccountLocale(fn () => $type->plainText($message->content, $message->content_attributes ?? []));

            return "[tin dạng {$contentType}] ".trim((string) $plain);
        } catch (Throwable) {
            return "[tin dạng {$contentType}] {$text}";
        }
    }
}
