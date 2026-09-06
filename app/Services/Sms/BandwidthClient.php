<?php

namespace App\Services\Sms;

use App\Models\Channel\Sms;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

// Cửa gọi Bandwidth Messaging API (thay HTTParty trong Channel::Sms).
class BandwidthClient
{
    public function __construct(private readonly Sms $channel) {}

    /** @param array<string, mixed> $body */
    public function sendMessage(array $body): Response
    {
        $config = $this->channel->provider_config ?? [];

        return Http::withBasicAuth($config['api_key'] ?? '', $config['api_secret'] ?? '')
            ->asJson()
            ->post($this->channel->apiBasePath()."/users/{$this->accountId()}/messages", $body);
    }

    private function accountId(): string
    {
        return (string) ($this->channel->provider_config['account_id'] ?? '');
    }
}
