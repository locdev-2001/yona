<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Messaging\Inbound\MessageEventService;
use App\Models\Channel\FacebookPage;
use App\Services\Facebook\MessageParser;

/** Biên nhận và cảm xúc của Messenger lên tin đã có. */
class FacebookMessageEventsJob extends ApplicationJob
{
    /** @param array<string, mixed> $messaging */
    public function __construct(public readonly array $messaging) {}

    public function handle(): void
    {
        $payload = new MessageParser($this->messaging);
        $events = $payload->events();

        if ($events === []) {
            return;
        }

        FacebookPage::query()->where('page_id', $payload->recipientId())->get()
            ->filter(fn (FacebookPage $page) => $page->inbox !== null)
            ->each(function (FacebookPage $page) use ($events) {
                foreach ($events as $event) {
                    app(MessageEventService::class)->apply($page->inbox, $event);
                }
            });
    }
}
