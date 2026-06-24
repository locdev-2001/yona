<?php

namespace App\Listeners;

use App\Events\LeadAssigned;
use App\Models\User;
use App\Notifications\LeadAssignedNotification;

/**
 * P07 — Listen for LeadAssigned, notify the assignee (DB + email).
 * Self-assignment (assigning to yourself): notification is still sent.
 * No-op when assigned_to is null (unassignment).
 */
class SendLeadAssignedNotification
{
    public function handle(LeadAssigned $event): void
    {
        $lead = $event->lead;

        if ($lead->assigned_to === null) {
            return;
        }

        $assignee = User::find($lead->assigned_to);

        if ($assignee === null) {
            return;
        }

        $assignedByName = auth()->user()?->name;

        $assignee->notify(
            new LeadAssignedNotification($lead, $assignedByName)
        );
    }
}
