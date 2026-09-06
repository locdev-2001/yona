<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Services\Instagram\MessageTextService;

// Port từ refs/chatwoot/app/jobs/webhooks/instagram_events_job.rb.
class InstagramEventsJob extends ApplicationJob
{
    /** @param list<array<string, mixed>> $entries */
    public function __construct(public readonly array $entries) {}

    public function handle(): void
    {
        foreach ($this->entries as $entry) {
            $this->processEntry($entry);
        }
    }

    /** @param array<string, mixed> $entry */
    private function processEntry(array $entry): void
    {
        // Payload thử nghiệm của Facebook dashboard gói messaging trong `changes`.
        $messages = filled($entry['messaging'] ?? null)
            ? $entry['messaging']
            : ($entry['standby'] ?? array_filter(array_map(fn ($change) => $change['value'] ?? null, $entry['changes'] ?? [])));

        foreach ($messages as $messaging) {
            if (blank($messaging['message'] ?? null)) {
                continue;
            }

            $instagramId = filled(data_get($messaging, 'message.is_echo'))
                ? data_get($messaging, 'sender.id')
                : data_get($messaging, 'recipient.id');

            $channel = $this->findChannel((string) $instagramId);

            if ($channel === null) {
                continue;
            }

            (new MessageTextService($messaging, $channel))->perform();
        }
    }

    private function findChannel(string $instagramId): ?object
    {
        // Ưu tiên kênh Instagram login trực tiếp, sau đó tới Instagram gắn qua trang Facebook.
        return Instagram::query()->where('instagram_id', $instagramId)->first()
            ?? FacebookPage::query()->where('instagram_id', $instagramId)->first();
    }
}
