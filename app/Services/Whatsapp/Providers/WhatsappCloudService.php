<?php

namespace App\Services\Whatsapp\Providers;

use App\Models\Message;
use Illuminate\Support\Facades\Http;

// Port từ refs/chatwoot/app/services/whatsapp/providers/whatsapp_cloud_service.rb
// (đường gửi tin thường + đính kèm; sync template/CSAT/voice chưa port — xem note).
class WhatsappCloudService extends BaseWhatsappService
{
    public function sendMessage(string $phoneNumber, Message $message): ?string
    {
        return $message->attachments()->exists()
            ? $this->sendAttachmentMessage($phoneNumber, $message)
            : $this->sendTextMessage($phoneNumber, $message);
    }

    public function mediaUrl(string $mediaId): string
    {
        return $this->apiBasePath().'/v13.0/'.$mediaId;
    }

    /** @return array<string, string> */
    public function apiHeaders(): array
    {
        return [
            'Authorization' => 'Bearer '.($this->channel->provider_config['api_key'] ?? ''),
            'Content-Type' => 'application/json',
        ];
    }

    private function sendTextMessage(string $phoneNumber, Message $message): ?string
    {
        $response = Http::withHeaders($this->apiHeaders())->post($this->phoneIdPath().'/messages', [
            'messaging_product' => 'whatsapp',
            'to' => $phoneNumber,
            'text' => ['body' => $message->content],
            'type' => 'text',
        ]);

        return $this->processResponse($response, $message);
    }

    private function sendAttachmentMessage(string $phoneNumber, Message $message): ?string
    {
        $attachment = $message->attachments->first();
        $type = in_array($attachment->fileTypeName(), ['image', 'audio', 'video'], true) ? $attachment->fileTypeName() : 'document';

        $typeContent = ['link' => $attachment->downloadUrl()];

        if ($type !== 'audio') {
            $typeContent['caption'] = $message->content;
        }

        if ($type === 'document') {
            $typeContent['filename'] = $attachment->filename;
        }

        $response = Http::withHeaders($this->apiHeaders())->post($this->phoneIdPath('v24.0').'/messages', [
            'messaging_product' => 'whatsapp',
            'to' => $phoneNumber,
            'type' => $type,
            $type => $typeContent,
        ]);

        return $this->processResponse($response, $message);
    }

    private function apiBasePath(): string
    {
        return (string) config('services.whatsapp_cloud.base_url', 'https://graph.facebook.com');
    }

    private function phoneIdPath(string $version = 'v13.0'): string
    {
        return $this->apiBasePath()."/{$version}/".($this->channel->provider_config['phone_number_id'] ?? '');
    }
}
