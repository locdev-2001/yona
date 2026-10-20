<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Models\Account;
use App\Models\Message;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use App\Support\SuperAdminArea;
use Illuminate\Support\Facades\DB;

final class TopAccountsWidget extends MetricWidget
{
    private const LIMIT = 8;

    public function key(): string
    {
        return 'top_accounts';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Medium;
    }

    public function compute(DateRange $range): array
    {
        $ranking = Account::wherePersonal(DB::table('messages'), 'messages.account_id')
            ->where('created_at', '>=', $range->startsAtUtc())
            ->where('created_at', '<', $range->endsBeforeUtc())
            ->whereIn('message_type', [Message::TYPE_INCOMING, Message::TYPE_OUTGOING])
            ->where('private', false)
            ->groupBy('account_id')
            ->selectRaw('account_id, count(*) as messages_count')
            ->orderByDesc('messages_count')
            ->orderBy('account_id')
            ->limit(self::LIMIT);

        $items = DB::query()
            ->fromSub($ranking, 'ranking')
            ->join('accounts', 'accounts.id', '=', 'ranking.account_id')
            ->orderByDesc('ranking.messages_count')
            ->orderBy('ranking.account_id')
            ->get(['accounts.id', 'accounts.name', 'ranking.messages_count'])
            ->map(static fn (object $row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'messages' => (int) $row->messages_count,
                'url' => SuperAdminArea::url("accounts/{$row->id}"),
            ])
            ->all();

        return ['range' => $range->toArray(), 'items' => $items];
    }
}
