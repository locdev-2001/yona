<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Services\Instagram\MessageParser;
use App\Services\Instagram\MessageTextService;

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
            $payload = new MessageParser($messaging);

            if (! $payload->hasMessage() && ! $payload->hasEvents()) {
                continue;
            }

            // Tin dội lại do tài khoản kinh doanh gửi; mọi thứ khác (tin khách, cảm xúc,
            // đã xem) trỏ tài khoản kinh doanh ở phía người nhận.
            $instagramId = $payload->isEcho() ? $payload->senderId() : $payload->recipientId();

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
