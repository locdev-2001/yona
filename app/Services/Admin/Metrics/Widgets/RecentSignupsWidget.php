<?php

namespace App\Services\Admin\Metrics\Widgets;

use App\Models\AccountUser;
use App\Services\Admin\Metrics\DateRange;
use App\Services\Admin\Metrics\MetricWidget;
use App\Services\Admin\Metrics\WidgetSize;
use App\Support\SuperAdminArea;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class RecentSignupsWidget extends MetricWidget
{
    private const LIMIT = 10;

    public function key(): string
    {
        return 'recent_signups';
    }

    public function defaultSize(): WidgetSize
    {
        return WidgetSize::Medium;
    }

    public function dependsOnRange(): bool
    {
        return false;
    }

    // Chủ account = quản trị viên vào account sớm nhất.
    public function compute(DateRange $range): array
    {
        $ownerEmail = DB::table('account_users')
            ->join('users', 'users.id', '=', 'account_users.user_id')
            ->whereColumn('account_users.account_id', 'accounts.id')
            ->where('account_users.role', AccountUser::ROLE_ADMINISTRATOR)
            ->orderBy('account_users.id')
            ->limit(1)
            ->select('users.email');

        $inboxesCount = DB::table('inboxes')
            ->whereColumn('inboxes.account_id', 'accounts.id')
            ->selectRaw('count(*)');

        $items = DB::table('accounts')
            ->select(['accounts.id', 'accounts.name', 'accounts.created_at'])
            ->selectSub($ownerEmail, 'owner_email')
            ->selectSub($inboxesCount, 'inboxes_count')
            ->orderByDesc('accounts.created_at')
            ->orderByDesc('accounts.id')
            ->limit(self::LIMIT)
            ->get()
            ->map(static fn (object $row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'createdAt' => Carbon::parse($row->created_at, 'UTC')->toIso8601String(),
                'ownerEmail' => $row->owner_email,
                'inboxesCount' => (int) $row->inboxes_count,
                'url' => SuperAdminArea::url("accounts/{$row->id}"),
            ])
            ->all();

        return ['items' => $items];
    }
}
