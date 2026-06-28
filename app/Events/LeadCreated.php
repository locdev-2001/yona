<?php

namespace App\Events;

use App\Models\Lead;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired after a Lead is created (P07).
 * Listeners can send welcome emails, trigger automations, etc.
 */
class LeadCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Lead $lead) {}
}
