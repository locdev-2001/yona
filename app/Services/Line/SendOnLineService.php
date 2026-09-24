<?php

namespace App\Services\Line;

use App\Models\Channel\Line;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Messages\StatusUpdateService;

// Port từ refs/chatwoot/app/services/line/send_on_line_service.rb.
class SendOnLineService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return Line::class;
    }

    protected function performReply(): void
    {
        $response = (new LineClient($this->channel()))->pushMessage((string) $this->sourceId(), $this->buildPayload());

        if ($response->successful()) {
            (new StatusUpdateService($this->message, 'delivered'))->perform();

            return;
        }

        ChannelMessageStatus::fail($this->message, $this->externalError((array) $response->json()));
    }

    /** @return array<int|string, mixed> */
    private function buildPayload(): array
    {
        if ($this->message->contentTypeName() === 'input_select' && filled($this->message->content_attributes['items'] ?? null)) {
            return [$this->inputSelectPayload()];
        }

        $attachments = $this->attachmentPayloads();

        if (blank($this->message->content)) {
            return $attachments;
        }

        return $attachments === [] ? [$this->textMessage()] : [$this->textMessage(), ...$attachments];
    }

    /** @return array<string, mixed> */
    private function textMessage(): array
    {
        return ['type' => 'text', 'text' => $this->message->outgoingContent()];
    }

    /** @return list<array<string, mixed>> */
    private function attachmentPayloads(): array
    {
        $payloads = [];

        foreach ($this->message->attachments as $attachment) {
            if (! in_array($attachment->fileTypeName(), ['image', 'video'], true)) {
                continue;
            }

            // fileUrl (redirect vĩnh viễn) thay downloadUrl (ký hạn 5 phút) — app LINE tải ảnh trễ.
            $originalUrl = $attachment->fileUrl();

            $payloads[] = [
                'type' => $attachment->fileTypeName(),
                'originalContentUrl' => $originalUrl,
                'previewImageUrl' => $attachment->thumbUrl() ?: $originalUrl,
            ];
        }

        return $payloads;
    }

    /** @return array<string, mixed> */
    private function inputSelectPayload(): array
    {
        $buttons = array_map(fn (array $item) => [
            'type' => 'button',
            'style' => 'link',
            'height' => 'sm',
            'action' => ['type' => 'message', 'label' => $item['title'], 'text' => $item['value']],
        ], $this->message->content_attributes['items']);

        return [
            'type' => 'flex',
            'altText' => $this->message->outgoingContent(),
            'contents' => [
                'type' => 'bubble',
                'body' => [
                    'type' => 'box',
                    'layout' => 'vertical',
                    'contents' => [
                        ['type' => 'text', 'text' => $this->message->outgoingContent(), 'wrap' => true],
                        ...$buttons,
                    ],
                ],
            ],
        ];
    }

    /** @param array<string, mixed> $error */
    private function externalError(array $error): string
    {
        $message = (string) ($error['message'] ?? '');
        $details = $error['details'] ?? [];

        if (blank($details)) {
            return $message;
        }

        return implode(', ', [$message, ...array_map(
            fn (array $detail) => ($detail['property'] ?? '').': '.($detail['message'] ?? ''),
            $details,
        )]);
    }
}
