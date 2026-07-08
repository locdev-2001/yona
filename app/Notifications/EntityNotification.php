<?php

namespace App\Notifications;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Notifications\Notification;

/**
 * Generic data-driven notification for CRM entities (DRY: one class, many events).
 * M1 phases reuse this for lead.assigned, task.assigned, reminder.due, etc.
 *
 * Channel: database only. Extend via() to add mail/broadcast when P05 is ready.
 */
class EntityNotification extends Notification
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly string $action,
        public readonly Model $subject,
        public readonly array $payload = [],
        public readonly ?string $link = null,
    ) {}

    /**
     * Channels to deliver on. Only 'database' for now.
     * ShouldBroadcast interface reserved for Reverb in a future phase.
     *
     * @return list<string>
     */
    public function via(mixed $notifiable): array
    {
        return ['database'];
    }

    /**
     * Data stored in notifications.data (jsonb). Consumed by React notification panel.
     *
     * @return array<string, mixed>
     */
    public function toArray(mixed $notifiable): array
    {
        return [
            'action' => $this->action,
            'subject_type' => $this->subject->getMorphClass(),
            'subject_id' => (string) $this->subject->getKey(),
            'payload' => $this->payload,
            'link' => $this->link,
        ];
    }
}
