<?php

namespace App\Services\Calls\Media\LiveKit;

use App\Services\Calls\Media\MediaDriver;
use App\Services\Calls\Media\MediaModeration;
use App\Services\Calls\Media\MediaRooms;
use App\Services\Calls\Media\MediaTickets;
use App\Services\Calls\Media\MediaWebhooks;

// LiveKit tự cài: driver media duy nhất hiện nay.
final readonly class LiveKitDriver implements MediaDriver
{
    public function __construct(
        private LiveKitCredentials $credentials,
        private LiveKitRooms $rooms,
        private LiveKitTickets $tickets,
        private LiveKitModeration $moderation,
        private LiveKitWebhooks $webhooks,
    ) {}

    public function isConfigured(): bool
    {
        return $this->credentials->isComplete();
    }

    public function rooms(): MediaRooms
    {
        return $this->rooms;
    }

    public function tickets(): MediaTickets
    {
        return $this->tickets;
    }

    public function moderation(): MediaModeration
    {
        return $this->moderation;
    }

    public function webhooks(): MediaWebhooks
    {
        return $this->webhooks;
    }
}
