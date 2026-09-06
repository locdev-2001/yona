<?php

namespace App\Builders\Reports;

use App\Models\Inbox;
use App\Services\Reports\ReportScope;

// Port từ V2::Reports::InboxSummaryBuilder.
final class InboxSummaryBuilder extends BaseSummaryBuilder
{
    protected function dimensionType(): string
    {
        return ReportScope::TYPE_INBOX;
    }

    protected function prepareReport(): array
    {
        return $this->account->inboxes()
            ->get()
            ->map(fn (Inbox $inbox) => $this->statsFor((int) $inbox->id))
            ->values()
            ->all();
    }
}
