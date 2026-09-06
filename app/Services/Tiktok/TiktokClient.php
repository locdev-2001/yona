<?php

namespace App\Services\Tiktok;

use App\Models\Channel\Tiktok;
use Illuminate\Support\Facades\Http;
use RuntimeException;

// Port từ refs/chatwoot/app/services/tiktok/client.rb (Business Messaging API).
class TiktokClient
{
    public function __construct(private readonly Tiktok $channel) {}

    public function fileDownloadUrl(string $conversationId, string $messageId, string $mediaId, string $mediaType = 'IMAGE'): ?string
    {
        $response = Http::withHeaders($this->headers())->post($this->apiBaseUrl().'/business/message/media/download/', [
            'business_id' => $this->channel->business_id,
            'conversation_id' => $conversationId,
            'message_id' => $messageId,
            'media_id' => $mediaId,
            'media_type' => $mediaType,
        ]);

        return $response->successful() ? $response->json('data.download_url') : null;
    }

    public function sendTextMessage(string $conversationId, ?string $text, ?string $referencedMessageId = null): string
    {
        $body = [
            'business_id' => $this->channel->business_id,
            'recipient_type' => 'CONVERSATION',
            'recipient' => $conversationId,
            'message_type' => 'TEXT',
            'text' => ['body' => $text],
        ];

        if (filled($referencedMessageId)) {
            $body['referenced_message_info'] = ['referenced_message_id' => $referencedMessageId];
        }

        $response = Http::withHeaders($this->headers())->post($this->apiBaseUrl().'/business/message/send/', $body);

        if (! $response->successful() || blank($response->json('data.message.message_id'))) {
            throw new RuntimeException('Failed to send TikTok message: '.$response->body());
        }

        return (string) $response->json('data.message.message_id');
    }

    /** @return array<string, string> */
    private function headers(): array
    {
        return ['Access-Token' => $this->channel->access_token, 'Content-Type' => 'application/json'];
    }

    private function apiBaseUrl(): string
    {
        return 'https://business-api.tiktok.com/open_api/'.config('services.tiktok.api_version', 'v1.3');
    }
}
