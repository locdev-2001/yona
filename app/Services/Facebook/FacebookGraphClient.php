<?php

namespace App\Services\Facebook;

use App\Models\Channel\FacebookPage;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

// Thay gem koala / facebook-messenger: Graph API qua Http facade.
class FacebookGraphClient
{
    public function __construct(private readonly FacebookPage $channel) {}

    /** @return array<string, mixed> */
    public function userProfile(string $userId): array
    {
        $response = Http::get($this->baseUri()."/{$userId}", [
            'fields' => 'name,first_name,last_name,profile_pic',
            'access_token' => $this->channel->page_access_token,
        ]);

        if ($response->successful()) {
            return (array) $response->json();
        }

        if ((int) $response->json('error.code') === 190) {
            $this->channel->authorizationError();
        }

        return [];
    }

    /** @param array<string, mixed> $payload */
    public function sendMessage(array $payload): Response
    {
        return Http::post($this->baseUri().'/me/messages', [
            ...$payload,
            'access_token' => $this->channel->page_access_token,
        ]);
    }

    public function subscribe(): void
    {
        Http::post($this->baseUri()."/{$this->channel->page_id}/subscribed_apps", [
            'subscribed_fields' => 'messages,message_deliveries,message_echoes,message_reads,standby,messaging_handovers',
            'access_token' => $this->channel->page_access_token,
        ]);
    }

    public function unsubscribe(): void
    {
        Http::delete($this->baseUri()."/{$this->channel->page_id}/subscribed_apps", [
            'access_token' => $this->channel->page_access_token,
        ]);
    }

    private function baseUri(): string
    {
        return 'https://graph.facebook.com/'.config('services.facebook.api_version', 'v22.0');
    }
}
