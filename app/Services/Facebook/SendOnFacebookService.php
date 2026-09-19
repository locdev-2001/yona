<?php

namespace App\Services\Facebook;

use App\Models\Attachment;
use App\Models\Channel\FacebookPage;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;

// Port từ refs/chatwoot/app/services/facebook/send_on_facebook_service.rb.
class SendOnFacebookService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return FacebookPage::class;
    }

    protected function performReply(): void
    {
        if (filled($this->message->content)) {
            $this->deliver($this->textMessageParams());
        }

        foreach ($this->message->attachments as $attachment) {
            $this->deliver($this->attachmentMessageParams($attachment));
        }
    }

    /** @param array<string, mixed> $payload */
    private function deliver(array $payload): void
    {
        $response = (new FacebookGraphClient($this->channel()))->sendMessage($payload);

        if (filled($response->json('error'))) {
            ChannelMessageStatus::fail($this->message, $response->json('error.code').' - '.$response->json('error.message'));

            return;
        }

        if (filled($response->json('message_id'))) {
            $this->message->update(['source_id' => $response->json('message_id')]);
        }
    }

    /** @return array<string, mixed> */
    private function textMessageParams(): array
    {
        $payload = $this->message->contentTypeName() === 'input_select' && filled($this->message->content_attributes['items'] ?? null)
            ? [
                'text' => $this->message->content,
                'quick_replies' => array_map(fn (array $item) => [
                    'content_type' => 'text',
                    'payload' => $item['title'],
                    'title' => $item['title'],
                ], $this->message->content_attributes['items']),
            ]
            : ['text' => $this->message->content];

        return $this->withHumanAgentTag([
            'recipient' => ['id' => $this->sourceId()],
            'message' => $payload,
        ]);
    }

    /** @return array<string, mixed> */
    private function attachmentMessageParams(Attachment $attachment): array
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
