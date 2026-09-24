<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Models\Channel\Line;
use App\Services\Line\IncomingMessageService;

// Chữ ký LINE được
// kiểm ở job (đúng bản gốc), nên payload thô đi kèm.
class LineEventsJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(
        public readonly array $params,
        public readonly string $signature = '',
        public readonly string $postBody = '',
    ) {}

    public function handle(): void
    {
        $channel = Line::query()->where('line_channel_id', $this->params['line_channel_id'] ?? '')->first();

        if ($channel === null || $channel->inbox === null) {
            return;
        }

        $expected = base64_encode(hash_hmac('sha256', $this->postBody, $channel->line_channel_secret, true));

        if (! hash_equals($expected, $this->signature)) {
            return;
        }

        (new IncomingMessageService($channel->inbox, (array) ($this->params['line'] ?? [])))->perform();
    }
}
