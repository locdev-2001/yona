<?php

namespace App\Services\Messages;

use App\Models\Message;

class StatusUpdateService
{
    public function __construct(
        private readonly Message $message,
        private readonly string $status,
    ) {}

    public function perform(): bool
    {
        if (! array_key_exists($this->status, Message::STATUSES)) {
            return false;
        }

        // Không cho lùi từ 'read' về 'delivered'.
        if ($this->message->status === Message::STATUSES['read'] && $this->status === 'delivered') {
            return false;
        }

        $this->message->update(['status' => Message::STATUSES[$this->status]]);

        return true;
    }
}
