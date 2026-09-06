<?php

namespace App\Builders\Reports;

use App\Models\Team;
use App\Services\Reports\ReportScope;

// Port từ V2::Reports::TeamSummaryBuilder.
final class TeamSummaryBuilder extends BaseSummaryBuilder
{
    protected function dimensionType(): string
    {
        return ReportScope::TYPE_TEAM;
    }

    protected function prepareReport(): array
    {
        return $this->account->teams()
            ->get()
            ->map(fn (Team $team) => $this->statsFor((int) $team->id))
            ->values()
            ->all();
    }
}
