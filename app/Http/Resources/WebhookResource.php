<?php

namespace App\Http\Resources;

use App\Models\Webhook;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/webhooks/_webhook.json.jbuilder.
class WebhookResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Webhook $webhook */
        $webhook = $this->resource;
        $inbox = $webhook->inbox;

        return [
            'id' => $webhook->id,
            'name' => $webhook->name,
            'url' => $webhook->url,
            'account_id' => $webhook->account_id,
            'subscriptions' => $webhook->subscriptions ?? [],
            'secret' => $webhook->secret,
            ...($inbox === null ? [] : ['inbox' => ['id' => $inbox->id, 'name' => $inbox->name]]),
        ];
    }

    /** @param iterable<Webhook> $webhooks */
    public static function collectionFor(iterable $webhooks): array
    {
        return collect($webhooks)
            ->map(fn (Webhook $webhook) => (new self($webhook))->toArray(request()))
            ->values()
            ->all();
    }
}
