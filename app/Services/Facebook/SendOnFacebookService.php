<?php

namespace App\Services\Facebook;

use App\Messaging\Delivery\DeliveryLevel;
use App\Messaging\Delivery\DeliveryPlan;
use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Attachment;
use App\Models\Channel\FacebookPage;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Facebook\Concerns\BuildsMessengerReplyTo;

class SendOnFacebookService extends BaseSendOnChannelService
{
    use BuildsMessengerReplyTo;

    protected function channelClass(): string
    {
        return FacebookPage::class;
    }

    protected function performReply(): void
    {
        $plan = app(DeliveryPlanner::class)->plan($this->message, $this->channel()->capabilities());

        $payloads = [
            ...array_map(fn (array $part) => $this->messageParams($part), $this->messageParts($plan)),
            ...$this->message->attachments->map(fn (Attachment $attachment) => $this->attachmentMessageParams($attachment))->all(),
        ];

        foreach ($this->withMessengerReplyToOnFirst($payloads) as $payload) {
            $this->deliver($payload);
        }
    }

    /** @return list<array<string, mixed>> */
    private function messageParts(DeliveryPlan $plan): array
    {
        if ($plan->level === DeliveryLevel::Native) {
            return $plan->parts;
        }

        return filled($plan->plainText()) ? [['text' => $plan->plainText()]] : [];
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

    /**
     * @param  array<string, mixed>  $message  phần đã dựng bởi DeliveryPlanner (text thuần
     *                                         hoặc payload gốc kèm quick_replies)
     * @return array<string, mixed>
     */
    private function messageParams(array $message): array
    {
        return $this->withHumanAgentTag([
            'recipient' => ['id' => $this->sourceId()],
            'message' => $message,
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
