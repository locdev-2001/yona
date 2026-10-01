<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Models\Message;
use App\Models\SuperAdmin;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use Illuminate\Support\Facades\DB;

final class KpisWidget extends MetricWidget
{
    public function key(): string
    {
        return 'kpis';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Full;
    }

    public function compute(DateRange $range): array
    {
        $previous = $range->previous();
        $messages = $this->messageCounts($range, $previous);
        $newConversations = $this->createdCounts('conversations', $range, $previous);
        $newAccounts = $this->createdCounts('accounts', $range, $previous);

        return [
            'range' => $range->toArray(),
            'metrics' => [
                $this->metric('accounts_total', DB::table('accounts')->count()),
                $this->metric('accounts_new', $newAccounts['current'], $newAccounts['previous']),
                $this->metric('accounts_active', (int) $messages->active, (int) $messages->active_previous),
                $this->metric('users_total', $this->agentCount()),
                $this->metric('conversations_new', $newConversations['current'], $newConversations['previous']),
                $this->metric('messages_incoming', (int) $messages->incoming, (int) $messages->incoming_previous),
                $this->metric('messages_outgoing', (int) $messages->outgoing, (int) $messages->outgoing_previous),
                $this->metric('inboxes_total', DB::table('inboxes')->count()),
            ],
        ];
    }

    /** @return array{key: string, value: int, previous: int|null, changePercent: float|null} */
    private function metric(string $key, int $value, ?int $previous = null): array
    {
        return [
            'key' => $key,
            'value' => $value,
            'previous' => $previous,
            'changePercent' => $previous === null || $previous === 0 ? null : round(($value - $previous) / $previous * 100, 1),
        ];
    }

    // Một lượt quét messages cho cả kỳ này lẫn kỳ trước; tài khoản hoạt động là
    // tài khoản có trả lời khách (tin ra, không tính ghi chú nội bộ).
    private function messageCounts(DateRange $range, DateRange $previous): object
    {
        $incoming = Message::TYPE_INCOMING;
        $outgoing = Message::TYPE_OUTGOING;

        return DB::table('messages')
            ->where('created_at', '>=', $previous->startsAtUtc())
            ->where('created_at', '<', $range->endsBeforeUtc())
            ->whereIn('message_type', [$incoming, $outgoing])
            ->where('private', false)
            ->selectRaw(
                "count(*) filter (where message_type = {$incoming} and created_at >= ?) as incoming,"
                ." count(*) filter (where message_type = {$incoming} and created_at < ?) as incoming_previous,"
                ." count(*) filter (where message_type = {$outgoing} and created_at >= ?) as outgoing,"
                ." count(*) filter (where message_type = {$outgoing} and created_at < ?) as outgoing_previous,"
                ." count(distinct account_id) filter (where message_type = {$outgoing} and created_at >= ?) as active,"
                ." count(distinct account_id) filter (where message_type = {$outgoing} and created_at < ?) as active_previous",
                array_fill(0, 6, $range->startsAtUtc()),
            )
            ->first();
    }

    /** @return array{current: int, previous: int} */
    private function createdCounts(string $table, DateRange $range, DateRange $previous): array
    {
        $row = DB::table($table)
            ->where('created_at', '>=', $previous->startsAtUtc())
            ->where('created_at', '<', $range->endsBeforeUtc())
            ->selectRaw(
                'count(*) filter (where created_at >= ?) as current, count(*) filter (where created_at < ?) as previous',
                [$range->startsAtUtc(), $range->startsAtUtc()],
            )
            ->first();

        return ['current' => (int) $row->current, 'previous' => (int) $row->previous];
    }

    private function agentCount(): int
    {
        return DB::table('users')
            ->where(fn ($query) => $query->whereNull('type')->orWhere('type', '<>', SuperAdmin::TYPE))
            ->count();
    }
}
