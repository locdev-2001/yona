<?php

namespace App\Services\Whatsapp\Providers;

use App\Models\Message;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class Whatsapp360DialogService extends BaseWhatsappService
{
    private const API_BASE = 'https://waba.360dialog.io/v1';

    public function sendMessage(string $phoneNumber, Message $message): ?string
    {
        $response = $message->attachments()->exists()
            ? $this->sendAttachmentMessage($phoneNumber, $message)
            : $this->sendTextMessage($phoneNumber, $message);

        return $this->processResponse($response, $message);
    }

    public function mediaUrl(string $mediaId): string
    {
        return self::API_BASE.'/media/'.$mediaId;
    }

    /** @return array<string, string> */
    public function apiHeaders(): array
    {
        return [
            'D360-API-KEY' => (string) ($this->channel->provider_config['api_key'] ?? ''),
            'Content-Type' => 'application/json',
        ];
    }

    private function sendTextMessage(string $phoneNumber, Message $message): Response
    {
        return Http::withHeaders($this->apiHeaders())->post(self::API_BASE.'/messages', [
            'to' => $phoneNumber,
            'text' => ['body' => $message->outgoingContent()],
            'type' => 'text',
        ]);
    }

    private function sendAttachmentMessage(string $phoneNumber, Message $message): Response
    {
        $attachment = $message->attachments->first();
        $type = in_array($attachment->fileTypeName(), ['image', 'audio', 'video'], true) ? $attachment->fileTypeName() : 'document';

        $typeContent = ['link' => $attachment->downloadUrl()];

        if ($type !== 'audio') {
            $typeContent['caption'] = $message->outgoingContent();
        }

        return Http::withHeaders($this->apiHeaders())->post(self::API_BASE.'/messages', [
            'to' => $phoneNumber,
            'type' => $type,
            $type => $typeContent,
        ]);
    }
}
