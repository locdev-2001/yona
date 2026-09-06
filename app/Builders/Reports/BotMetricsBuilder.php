<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\ReportingEvent;
use App\Services\Reports\ReportRange;
use Illuminate\Database\Eloquent\Builder;

// Port từ V2::Reports::BotMetricsBuilder — chỉ tính trên inbox đang bật bot.
final class BotMetricsBuilder
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return array<string, int> */
    public function metrics(): array
    {
        $conversationsCount = $this->botConversations()->count();

        return [
            'conversation_count' => $conversationsCount,
            'message_count' => $this->botMessages()->count(),
            'resolution_rate' => $this->rate($this->botResolutionsCount(), $conversationsCount),
            'handoff_rate' => $this->rate($this->botHandoffsCount(), $conversationsCount),
        ];
    }

    /** @return Builder<Conversation> */
    private function botConversations(): Builder
    {
        return $this->applyRange(
            Conversation::query()
                ->where('conversations.account_id', $this->account->id)
                ->whereIn('conversations.inbox_id', $this->botActivatedInboxIds()),
            'conversations.created_at',
        );
    }

    /** @return Builder<Message> */
    private function botMessages(): Builder
    {
        return $this->applyRange(
            Message::query()
                ->where('messages.account_id', $this->account->id)
                ->outgoing()
                ->whereIn('messages.conversation_id', $this->botConversations()->select('conversations.id')->toBase()),
            'messages.created_at',
        );
    }

    /** @return list<int> */
    private function botActivatedInboxIds(): array
    {
        return $this->account->inboxes()
            ->with('agentBotInbox')
            ->get()
            ->filter(fn (Inbox $inbox) => $inbox->activeBot())
            ->pluck('id')
            ->all();
    }

    private function botResolutionsCount(): int
    {
        // Hội thoại đã bàn giao cho người thì không tính là bot tự đóng.
        return (int) $this->reportingEvents(ReportingEvent::NAME_CONVERSATION_BOT_RESOLVED)
            ->whereNotIn('reporting_events.conversation_id', $this->botHandoffConversationIds())
            ->distinct()
            ->count('reporting_events.conversation_id');
    }

    private function botHandoffsCount(): int
    {
        return (int) $this->reportingEvents(ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF)
            ->distinct()
            ->count('reporting_events.conversation_id');
    }

    /** @return \Illuminate\Database\Query\Builder */
    private function botHandoffConversationIds()
    {
        return $this->reportingEvents(ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF)
            ->whereNotNull('reporting_events.conversation_id')
            ->select('reporting_events.conversation_id')
            ->toBase();
    }

    /** @return Builder<ReportingEvent> */
    private function reportingEvents(string $name): Builder
    {
        return $this->applyRange(
            ReportingEvent::query()
                ->where('reporting_events.account_id', $this->account->id)
                ->where('reporting_events.name', $name),
            'reporting_events.created_at',
        );
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function applyRange(Builder $query, string $column): Builder
    {
        $range = ReportRange::fromParams($this->params['since'] ?? null, $this->params['until'] ?? null);

        if ($range === null) {
            return $query;
        }

        return $query->where($column, '>=', $range->since)->where($column, '<', $range->until);
    }

    private function rate(int $count, int $total): int
    {
        return $total === 0 ? 0 : (int) ($count / $total * 100);
    }
}
