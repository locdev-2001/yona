<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Services\Reports\ReportScope;

/**
 * Port từ V2::ReportBuilder#conversation_metrics — số hội thoại đang mở "ngay
 * lúc này" cho cả account hoặc từng agent (endpoint `reports/conversations`).
 */
final class LiveConversationsBuilder
{
    public const AGENT_RESULTS_PER_PAGE = 25;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return array<string, int>|list<array<string, mixed>> */
    public function build(): array
    {
        if (($this->params['type'] ?? null) === ReportScope::TYPE_ACCOUNT) {
            return $this->liveConversations(ReportScope::for($this->account, ReportScope::TYPE_ACCOUNT), true);
        }

        $metrics = $this->agentMetrics();

        // `sort_by { … }.reverse` của bản gốc: sắp TĂNG dần (ổn định) rồi đảo mảng,
        // nên các agent bằng điểm ra theo thứ tự ngược danh sách account_users.
        usort($metrics, fn (array $left, array $right) => $left['metric']['open'] <=> $right['metric']['open']);

        return array_reverse($metrics);
    }

    /** @return list<array<string, mixed>> */
    private function agentMetrics(): array
    {
        $page = max(1, (int) ($this->params['page'] ?? 1));

        return $this->account->accountUsers()
            ->with('user')
            ->orderBy('id')
            ->forPage($page, self::AGENT_RESULTS_PER_PAGE)
            ->get()
            ->map(fn (AccountUser $accountUser) => [
                'id' => $accountUser->user->id,
                'name' => $accountUser->user->name,
                'email' => $accountUser->user->email,
                'thumbnail' => $accountUser->user->avatarUrl(),
                'availability' => $accountUser->availabilityStatus(),
                'metric' => $this->liveConversations(
                    ReportScope::for($this->account, ReportScope::TYPE_AGENT, $accountUser->user_id),
                    false,
                ),
            ])
            ->values()
            ->all();
    }

    /** @return array<string, int> */
    private function liveConversations(ReportScope $scope, bool $isAccount): array
    {
        $openConversations = $scope->conversations()->where('conversations.status', Conversation::STATUS_OPEN);

        $metric = [
            'open' => (clone $openConversations)->count(),
            'unattended' => (clone $openConversations)->unattended()->count(),
        ];

        if ($isAccount) {
            $metric['unassigned'] = (clone $openConversations)->unassigned()->count();
            // Bản gốc lọc `open` rồi lọc tiếp `pending` trên cùng cột status nên
            // luôn ra 0 — giữ nguyên để số liệu khớp bản gốc.
            $metric['pending'] = 0;
        }

        return $metric;
    }
}
