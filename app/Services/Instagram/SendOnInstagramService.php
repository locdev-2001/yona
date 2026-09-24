<?php

namespace App\Services\Instagram;

use App\Models\Attachment;
use App\Models\Channel\Instagram;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Facebook\Concerns\BuildsMessengerReplyTo;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

// Port từ refs/chatwoot/app/services/instagram/{base_send_service,send_on_instagram_service}.rb.
class SendOnInstagramService extends BaseSendOnChannelService
{
    use BuildsMessengerReplyTo;

    protected function channelClass(): string
    {
        return Instagram::class;
    }

    protected function performReply(): void
    {
        $payloads = [
            ...$this->message->attachments->map(fn (Attachment $attachment) => $this->attachmentParams($attachment))->all(),
            ...(filled($this->message->content) ? [$this->messageParams()] : []),
        ];

        foreach ($this->withMessengerReplyToOnFirst($payloads) as $payload) {
            $this->send($payload);
        }
    }

    /** @param array<string, mixed> $payload */
    private function send(array $payload): void
    {
        $channel = $this->channel();
        $instagramId = filled($channel->instagram_id) ? $channel->instagram_id : 'me';

        $response = Http::post(
            'https://graph.instagram.com/'.Instagram::apiVersion()."/{$instagramId}/messages?access_token=".$channel->access_token,
            $payload,
        );

        $this->processResponse($response);
    }

    private function processResponse(Response $response): void
    {
        if ($response->successful() && blank($response->json('error'))) {
            $this->message->update(['source_id' => $response->json('message_id')]);

            return;
        }

        if ((int) $response->json('error.code') === 190) {
            $this->channel()->authorizationError();
        }

        ChannelMessageStatus::fail($this->message, $response->json('error.code').' - '.$response->json('error.message'));
    }

    /** @return array<string, mixed> */
    private function messageParams(): array
    {
        return $this->withHumanAgentTag([
            'recipient' => ['id' => $this->sourceId()],
            'message' => ['text' => $this->message->content],
        ]);
    }

    /** @return array<string, mixed> */
    private function attachmentParams(Attachment $attachment): array
    {
        return $this->withHumanAgentTag([
            'recipient' => ['id' => $this->sourceId()],
            'message' => [
                'attachment' => [
                    'type' => in_array($attachment->fileTypeName(), ['image', 'audio', 'video', 'file'], true)
                        ? $attachment->fileTypeName()
                        : 'file',
                    'payload' => ['url' => $attachment->downloadUrl()],
                ],
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function withHumanAgentTag(array $params): array
    {
        return [...$params, 'messaging_type' => 'MESSAGE_TAG', 'tag' => 'HUMAN_AGENT'];
    }
}
