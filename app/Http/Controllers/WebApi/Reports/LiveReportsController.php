<?php

namespace App\Http\Controllers\WebApi\Reports;

use App\Models\Account;
use App\Models\Conversation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Port từ Api::V2::Accounts::LiveReportsController — số hội thoại "ngay bây giờ",
// không phụ thuộc khoảng thời gian.
class LiveReportsController extends BaseReportsController
{
    private const GROUP_SCOPES = ['team_id', 'assignee_id'];

    public function conversationMetrics(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);
        $conversations = $this->conversations($request, $account);

        return response()->json([
            'open' => (clone $conversations)->where('status', Conversation::STATUS_OPEN)->count(),
            'unattended' => (clone $conversations)->where('status', Conversation::STATUS_OPEN)->unattended()->count(),
            'unassigned' => (clone $conversations)->where('status', Conversation::STATUS_OPEN)->unassigned()->count(),
            'pending' => (clone $conversations)->where('status', Conversation::STATUS_PENDING)->count(),
        ]);
    }

    public function groupedConversationMetrics(Request $request, Account $account): JsonResponse
    {
        $this->authorizeReportView($request);
        $groupScope = (string) $request->query('group_by');

        if (! in_array($groupScope, self::GROUP_SCOPES, true)) {
            return response()->json(['error' => 'invalid group_by'], 422);
        }

        $open = $this->conversations($request, $account)->where('status', Conversation::STATUS_OPEN);
        $countByGroup = $this->groupedCount(clone $open, $groupScope);
        $unattendedByGroup = $this->groupedCount((clone $open)->unattended(), $groupScope);
        $unassignedByGroup = $this->groupedCount((clone $open)->unassigned(), $groupScope);

        $metrics = [];

        // Hội thoại chưa gán team/agent gộp thành một nhóm khóa null như bản gốc.
        foreach ($countByGroup as $key => [$groupId, $count]) {
            $metrics[] = [
                'open' => $count,
                'unattended' => $unattendedByGroup[$key][1] ?? 0,
                'unassigned' => $unassignedByGroup[$key][1] ?? 0,
                $groupScope => $groupId,
            ];
        }

        return response()->json($metrics);
    }

    /** @return Builder<Conversation> */
    private function conversations(Request $request, Account $account): Builder
    {
        $query = Conversation::query()->where('account_id', $account->id);
        $teamId = $request->query('team_id');

        if (filled($teamId)) {
            $team = $account->teams()->findOrFail($teamId);
            $query->where('team_id', $team->id);
        }

        return $query;
    }

    /**
     * @param  Builder<Conversation>  $query
     * @return array<string, array{0: int|null, 1: int}>
     */
    private function groupedCount(Builder $query, string $column): array
    {
        $rows = $query->reorder()->getQuery()
            ->select($column, DB::raw('count(*) as conversations_count'))
            ->groupBy($column)
            ->get();

        $counts = [];

        foreach ($rows as $row) {
            $groupId = $row->{$column} === null ? null : (int) $row->{$column};
            $counts[(string) $groupId] = [$groupId, (int) $row->conversations_count];
        }

        return $counts;
    }
}
