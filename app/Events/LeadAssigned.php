<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\Lead;

/**
 * Fired after a Lead is assigned (or reassigned) to a user (P07).
 * Listener: SendLeadAssignedNotification → DB notification + email template.
 */
class LeadAssigned
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Lead $lead) {}
}
