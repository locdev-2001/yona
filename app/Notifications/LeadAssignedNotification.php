<?php

namespace App\Notifications;

use App\Models\Lead;
use Illuminate\Notifications\Notification;

/**
 * P07 — Notification sent to the assignee when a lead is assigned to them.
 * Channel: database (in-app bell). The templated email is sent separately by the
 * SendLeadAssignedNotification listener so a mail failure can never break the assign.
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
        return ['database'];
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
}
