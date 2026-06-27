<?php

namespace Modules\CrmSales\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\Lead;

/**
 * Fired after a Lead is successfully converted to a Client (P07, G7).
 * Lead is not deleted (history preserved). Listeners can trigger follow-up flows.
 */
class LeadConverted
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly Client $client,
    ) {}
}
