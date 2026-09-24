<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Models\Channel\Telegram;
use App\Services\Telegram\IncomingMessageService;
use Illuminate\Support\Facades\Log;

class TelegramEventsJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(): void
    {
        $botToken = $this->params['bot_token'] ?? null;

        if (blank($botToken)) {
            return;
        }

        $channel = Telegram::findByBotToken((string) $botToken);

        if ($channel === null || ! $channel->account->isActive()) {
            Log::warning('Telegram event discarded: channel not found or account inactive');

            return;
        }

        $payload = $this->params['telegram'] ?? null;

        if (blank($payload) || $channel->inbox === null) {
            return;
        }

        (new IncomingMessageService($channel->inbox, $payload))->perform();
    }
}
