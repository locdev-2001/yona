<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\UsageMeter;
use App\Agent\ValueObjects\TurnContext;
use App\Agent\ValueObjects\UsageIncrement;
use Psr\Log\LoggerInterface;
use Throwable;

// Bảng ánh xạ DUY NHẤT từ kết cục lượt sang số liệu tổng kết. Mỗi lượt đã bắt đầu
// cộng một `turns`, thêm đúng một trong ba kết quả hoặc không gì cả:
//   Replied                                        → replies
//   HandedOff, đường lui GuardFailed               → handoffs (câu giữ chân + chuyển người)
//   đường lui LoopCap/TurnFailed/ModelRefused/TextOnly, job lượt hỏng → failed_turns
//   Waited, Interrupted, đường lui WindowClosed    → chỉ turns
// Ghi số liệu hỏng chỉ cảnh báo, không bao giờ làm hỏng lượt.
final class TurnTally
{
    private const FAILED_FALLBACKS = [FallbackReason::LoopCap, FallbackReason::TurnFailed, FallbackReason::ModelRefused, FallbackReason::TextOnly];

    public function __construct(
        private readonly UsageMeter $meter,
        private readonly LoggerInterface $logger,
    ) {}

    public function ended(Turn $turn, TurnEnd $end): void
    {
        $fallback = $end === TurnEnd::FellBack ? $turn->fallbackReason() : null;
        $handedOff = $end === TurnEnd::HandedOff || $fallback === FallbackReason::GuardFailed;
        $failed = in_array($fallback, self::FAILED_FALLBACKS, true);

        $this->add(fn () => new UsageIncrement(
            $turn->context->conversation->accountId,
            $turn->context->aiAgentId,
            turns: 1,
            replies: $end === TurnEnd::Replied ? 1 : 0,
            handoffs: $handedOff ? 1 : 0,
            failedTurns: $failed ? 1 : 0,
        ));
    }

    // Job lượt hỏng giữa chừng (lỗi bất ngờ, quá giờ): lượt không trả về kết cục nào.
    public function crashed(int $accountId, int $aiAgentId): void
    {
        $this->add(fn () => new UsageIncrement($accountId, $aiAgentId, turns: 1, failedTurns: 1));
    }

    public function claimBlocked(TurnContext $context): void
    {
        $this->add(fn () => new UsageIncrement($context->conversation->accountId, $context->aiAgentId, unsourcedBlocks: 1));
    }

    /** @param  callable(): UsageIncrement  $increment */
    private function add(callable $increment): void
    {
        try {
            $this->meter->add($increment());
        } catch (Throwable $exception) {
            $this->logger->warning('agent.turn.usage_failed', ['exception' => $exception::class]);
        }
    }
}
