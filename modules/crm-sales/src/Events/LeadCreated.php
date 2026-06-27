<?php

namespace Modules\CrmSales\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\CrmSales\Models\Lead;

/**
 * Fired after a Lead is created (P07).
 * Listeners can send welcome emails, trigger automations, etc.
 */
class LeadCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Lead $lead) {}
}
