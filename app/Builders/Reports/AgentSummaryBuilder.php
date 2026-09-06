<?php

namespace App\Builders\Reports;

use App\Models\AccountUser;
use App\Services\Reports\ReportScope;

// Port từ V2::Reports::AgentSummaryBuilder.
final class AgentSummaryBuilder extends BaseSummaryBuilder
{
    protected function dimensionType(): string
    {
        return ReportScope::TYPE_AGENT;
    }

    protected function prepareReport(): array
    {
        return $this->account->accountUsers()
            ->get()
            ->map(fn (AccountUser $accountUser) => $this->statsFor((int) $accountUser->user_id))
            ->values()
            ->all();
    }
}
