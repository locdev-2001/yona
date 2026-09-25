<?php

namespace App\Services\Line;

use App\Messaging\Delivery\DeliveryLevel;
use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Channel\Line;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Messages\StatusUpdateService;

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
        $plan = app(DeliveryPlanner::class)->plan($this->message, $this->channel()->capabilities());

        if ($plan->level === DeliveryLevel::Native) {
            return $plan->parts;
        }

        $attachments = $this->attachmentPayloads();
        $text = $plan->plainText();

        if (blank($text)) {
            return $attachments;
        }

        return $attachments === [] ? [$this->textMessage($text)] : [$this->textMessage($text), ...$attachments];
    }

    /** @return array<string, mixed> */
    private function textMessage(string $text): array
    {
        return ['type' => 'text', 'text' => $text];
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
