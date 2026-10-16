<?php

namespace App\Agent\Evals;

use App\Agent\Boundary\Evals\EvalConversations;
use Throwable;

// Chạy một kịch bản từ đầu tới cuối: mở hội thoại mới, khách giả nhắn từng tin qua đúng
// đường tạo tin của lõi, AI trả lời bằng chính runtime của agent (TurnPump), đọc lại câu
// trả lời từ hộp thư, tới khi khách đạt mục tiêu / bỏ đi / hết lượt / AI chuyển người;
// cuối cùng giám khảo chấm. Lỗi giữa chừng thành một lần chạy hỏng, không dừng cả vòng.
final class EvalRunner
{
    public function __construct(
        private readonly EvalConversations $conversations,
        private readonly TurnPump $pump,
        private readonly SimulatedCustomer $customer,
        private readonly Judge $judge,
    ) {}

    public function run(Scenario $scenario, ShopFixture $fixture, EvalShop $shop, int $repeat = 1): ScenarioRun
    {
        $spend = new EvalSpend;
        $conversationId = null;
        $transcript = [];
        $turns = [];

        try {
            $conversationId = $this->conversations->open($shop, $scenario->id, $scenario->customerName, $scenario->history);
            $scope = new EvalCallScope($shop->accountId, $conversationId, $scenario->id, 0);
            $transcript = $this->conversations->linesAfter($shop, $conversationId, 0);
            [$outcome, $transcript, $turns] = $this->converse($scenario, $shop, $conversationId, $scope, $spend, $transcript);
            $verdict = $this->judge->judge($scenario, $fixture, $transcript, $outcome, $scope, $spend);

            return $this->result($scenario, $shop, $repeat, $conversationId, $outcome, $transcript, $turns, $spend, $verdict);
        } catch (Throwable $exception) {
            // Giữ phần hội thoại đã diễn ra để còn xem được ca hỏng.
            $transcript = $conversationId === null ? $transcript : $this->conversations->linesAfter($shop, $conversationId, 0);

            return $this->result($scenario, $shop, $repeat, $conversationId, Outcome::EvalError, $transcript, $turns, $spend, null, $exception::class.': '.$exception->getMessage());
        }
    }

    /**
     * @param  list<TranscriptLine>  $transcript
     * @return array{0: Outcome, 1: list<TranscriptLine>, 2: list<TurnMeasure>}
     */
    private function converse(Scenario $scenario, EvalShop $shop, int $conversationId, EvalCallScope $scope, EvalSpend $spend, array $transcript): array
    {
        $turns = [];
        $message = $scenario->opening;

        for ($turn = 1; ; $turn++) {
            $lastSeenId = $transcript === [] ? 0 : $transcript[count($transcript) - 1]->messageId;
            $startedAt = hrtime(true);
            $this->conversations->customerSays($shop, $conversationId, $message);
            $this->pump->drain();
            $latencyMs = intdiv(hrtime(true) - $startedAt, 1_000_000);

            $newLines = $this->conversations->linesAfter($shop, $conversationId, $lastSeenId);
            $transcript = [...$transcript, ...$newLines];
            $replied = self::has($newLines, Speaker::Ai);
            $turns[] = new TurnMeasure($latencyMs, $replied);

            if (! $this->conversations->autoReplyOn($shop, $conversationId)) {
                return [self::has($newLines, Speaker::AiHandoffNote) ? Outcome::HandedOff : Outcome::TurnFailed, $transcript, $turns];
            }

            if ($turn >= $scenario->maxTurns) {
                return [Outcome::MaxTurns, $transcript, $turns];
            }

            $move = $this->customer->next($scenario, $transcript, $replied, $scope, $spend);

            if ($move->intent !== CustomerIntent::Continue) {
                return [$move->intent === CustomerIntent::GoalMet ? Outcome::GoalMet : Outcome::CustomerLeft, $transcript, $turns];
            }

            $message = (string) $move->message;
        }
    }

    /**
     * @param  list<TranscriptLine>  $transcript
     * @param  list<TurnMeasure>  $turns
     */
    private function result(Scenario $scenario, EvalShop $shop, int $repeat, ?int $conversationId, Outcome $outcome, array $transcript, array $turns, EvalSpend $spend, ?Verdict $verdict, ?string $error = null): ScenarioRun
    {
        $aiCalls = $conversationId === null ? ['cost_micro_usd' => 0, 'calls' => 0] : $this->conversations->aiModelCalls($shop, $conversationId);

        return new ScenarioRun(
            scenarioId: $scenario->id,
            title: $scenario->title,
            repeat: $repeat,
            conversationId: $conversationId,
            displayId: $conversationId === null ? null : $this->conversations->displayId($shop, $conversationId),
            outcome: $outcome,
            transcript: $transcript,
            turns: $turns,
            aiCostMicroUsd: $aiCalls['cost_micro_usd'],
            aiModelCalls: $aiCalls['calls'],
            evalCostMicroUsd: $spend->costMicroUsd(),
            verdict: $verdict,
            error: $error,
        );
    }

    /** @param list<TranscriptLine> $lines */
    private static function has(array $lines, Speaker $speaker): bool
    {
        foreach ($lines as $line) {
            if ($line->speaker === $speaker) {
                return true;
            }
        }

        return false;
    }
}
