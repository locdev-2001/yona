<?php

namespace App\Services\Twilio;

use App\Models\Channel\TwilioSms;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

// Thay gem twilio-ruby: REST API Messages qua Http facade.
class TwilioClient
{
    private const API_BASE = 'https://api.twilio.com/2010-04-01';

    public function __construct(private readonly TwilioSms $channel) {}

    /** @param array<string, mixed> $params */
    public function createMessage(array $params): Response
    {
        return Http::withBasicAuth($this->username(), $this->channel->auth_token)
            ->asForm()
            ->post(self::API_BASE."/Accounts/{$this->channel->account_sid}/Messages.json", $params);
    }

    private function username(): string
    {
        return filled($this->channel->api_key_sid) ? $this->channel->api_key_sid : $this->channel->account_sid;
    }
}
