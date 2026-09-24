<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Services\Facebook\MessageCreator;
use App\Services\Facebook\MessageParser;

class FacebookEventsJob extends ApplicationJob
{
    /** @param array<string, mixed> $messaging */
    public function __construct(public readonly array $messaging) {}

    public function handle(): void
    {
        (new MessageCreator(new MessageParser($this->messaging)))->perform();
    }
}
