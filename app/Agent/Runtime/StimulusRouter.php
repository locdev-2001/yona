<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\Contracts\Ports\EphemeralStore;
use App\Agent\Contracts\Ports\ModelSpend;
use App\Agent\Contracts\Ports\StimulusSink;
use App\Agent\ValueObjects\AgentNotice;
use App\Agent\ValueObjects\ConversationSnapshot;
use App\Agent\ValueObjects\Stimulus;
use App\Agent\ValueObjects\StimulusDecision;
use App\Agent\ValueObjects\StimulusDecisionKind;
use Carbon\CarbonImmutable;

// Cửa duy nhất của mọi kích thích. Kiểm theo thứ tự cố định: công tắc dừng (nền tảng,
// account) → hội thoại thủ công hoặc inbox chưa có AI đang bật → hết ngân sách ngày →
// hội thoại nhóm → giao cho AI của inbox. Job lượt tỉnh dậy gọi lại `decide`, không dùng
// quyết định lúc xếp hàng.
final class StimulusRouter implements StimulusSink
{
    private const NOTICE_TTL_SECONDS = 2 * 86_400;

    public function __construct(
        private readonly ConversationReader $reader,
        private readonly ModelSpend $spend,
        private readonly ConversationActionWriter $writer,
        private readonly EphemeralStore $store,
        private readonly TurnScheduler $scheduler,
        private readonly TurnSettings $settings,
    ) {}

    public function accept(Stimulus $stimulus): void
    {
        $snapshot = $this->reader->conversation($stimulus->conversation);
        $decision = $this->decide($snapshot);

        if ($decision->kind === StimulusDecisionKind::Respond && $snapshot !== null) {
            $this->scheduler->schedule($stimulus, $snapshot->channel);
        }
    }

    public function decide(?ConversationSnapshot $snapshot): StimulusDecision
    {
        return match (true) {
            ! $this->settings->enabled => StimulusDecision::ignore('kill_switch'),
            $snapshot === null => StimulusDecision::ignore('conversation_missing'),
            ! $snapshot->accountActive => StimulusDecision::ignore('account_inactive'),
            $snapshot->aiAgentId === null => StimulusDecision::ignore('no_replying_ai_agent'),
            $this->overDailyBudget($snapshot) => StimulusDecision::ignore('daily_budget_exhausted'),
            $snapshot->isGroup => StimulusDecision::decline('group_conversation'),
            default => StimulusDecision::respond($snapshot->aiAgentId),
        };
    }

    // Ngày tính theo múi giờ của inbox; ghi chú hết ngân sách tối đa một lần mỗi ngày mỗi hội thoại.
    private function overDailyBudget(ConversationSnapshot $snapshot): bool
    {
        if ($this->settings->dailyBudgetMicroUsd <= 0) {
            return false;
        }

        $now = CarbonImmutable::now($snapshot->timezone);
        $spent = $this->spend->costMicroUsd($snapshot->ref->accountId, $now->startOfDay()->toDateTimeImmutable(), $now->toDateTimeImmutable());

        if ($spent < $this->settings->dailyBudgetMicroUsd) {
            return false;
        }

        $noticeKey = "budget-notice:{$snapshot->ref->conversationId}:{$now->format('Y-m-d')}";

        if ($this->store->add($noticeKey, 1, self::NOTICE_TTL_SECONDS)) {
            $this->writer->postNotice($snapshot->ref, (int) $snapshot->aiAgentId, AgentNotice::BudgetExhausted);
        }

        return true;
    }
}
