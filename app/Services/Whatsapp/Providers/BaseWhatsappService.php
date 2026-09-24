<?php

namespace App\Services\Whatsapp\Providers;

use App\Channels\CapabilitySet;
use App\Models\Channel\Whatsapp;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Log;

abstract class BaseWhatsappService implements WhatsappProvider
{
    public function __construct(protected readonly Whatsapp $channel) {}

    public function capabilities(): CapabilitySet
    {
        return CapabilitySet::none();
    }

    // Whatsapp::Providers::BaseService#process_response — API trả 200 kèm khối error.
    protected function processResponse(Response $response, Message $message): ?string
    {
        if ($response->successful() && blank($response->json('error'))) {
            return $response->json('messages.0.id');
        }

        Log::error('[WHATSAPP] '.$response->body());

        $errorMessage = $this->errorMessage($response);

        if (filled($errorMessage)) {
            ChannelMessageStatus::fail($message, $errorMessage);
        }

        return null;
    }

    protected function errorMessage(Response $response): ?string
    {
        return $response->json('error.message');
    }
}
