<?php

namespace App\Listeners;

use App\Events\LeadAssigned;
use Modules\Identity\Models\User;
use App\Notifications\LeadAssignedNotification;
use App\Services\TemplatedMailer;
use Throwable;

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

        // In-app bell (database channel only — never throws on the assign request).
        $assignee->notify(
            new LeadAssignedNotification($lead, $assignedByName)
        );

        // Templated email is best-effort: a mail/template failure must NOT break the
        // assignment (the old toMail() returned null and 500'd via the mail channel).
        try {
            app(TemplatedMailer::class)->send('lead_assigned', $assignee, ['lead' => $lead]);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
