<?php

namespace Modules\CrmSales\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\CrmSales\Models\Lead;

/**
 * Fired after a Lead moves to a new pipeline stage (P07, G8).
 * Listeners can update forecasts, trigger automation, send alerts.
 */
class LeadStageChanged
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly string $previousStageId,
    ) {}
}
