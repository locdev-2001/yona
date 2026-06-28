<?php

namespace App\Events;

use App\Models\Client;
use App\Models\Lead;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

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
