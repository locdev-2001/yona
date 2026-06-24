<?php

namespace App\Notifications;

use App\Models\Lead;
use App\Services\TemplatedMailer;
use Illuminate\Notifications\Notification;

/**
 * P07 — Notification sent to the assignee when a lead is assigned to them.
 * Channels: database (in-app bell) + email template 'lead_assigned' (G9).
 */
class LeadAssignedNotification extends Notification
{
    public function __construct(
        public readonly Lead $lead,
        public readonly ?string $assignedByName = null,
    ) {}

    /**
     * @return list<string>
     */
    public function via(mixed $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Data stored in notifications.data (in-app bell).
     *
     * @return array<string, mixed>
     */
    public function toArray(mixed $notifiable): array
    {
        return [
            'action' => 'lead.assigned',
            'subject_type' => 'lead',
            'subject_id' => $this->lead->id,
            'payload' => [
                'lead_number' => $this->lead->lead_number,
                'lead_name' => $this->lead->name,
                'assigned_by' => $this->assignedByName,
            ],
            'link' => route('leads.show', $this->lead),
        ];
    }

    /**
     * Send via TemplatedMailer (G9 — context whitelist enforced inside mailer).
     * Returns null when mail channel is not supported via the standard toMail contract;
     * TemplatedMailer::send() is called from SendLeadAssignedNotification listener instead.
     */
    public function toMail(mixed $notifiable): ?object
    {
        // Email is dispatched by the listener using TemplatedMailer::send()
        // This channel registration ensures the mail delivery path exists.
        app(TemplatedMailer::class)->send(
            'lead_assigned',
            $notifiable,
            ['lead' => $this->lead]
        );

        return null;
    }
}
