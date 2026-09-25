<?php

namespace App\Services\Telegram;

use App\Messaging\Delivery\DeliveryLevel;
use App\Messaging\Delivery\DeliveryPlan;
use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Channel\Telegram;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use Illuminate\Http\Client\Response;

// (+ phần send_message_on_telegram của model và SendAttachmentsService rút gọn
// về đường media group / document theo URL).
class SendOnTelegramService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return Telegram::class;
    }

    protected function performReply(): void
    {
        $channel = $this->channel();
        $client = new TelegramClient($channel);
        $messageId = null;

        $plan = app(DeliveryPlanner::class)->plan($this->message, $channel->capabilities());

        if (filled($this->textToSend($plan))) {
            $messageId = $this->sendText($client, $plan);
        }

        if ($this->message->attachments()->exists()) {
            $messageId = $this->sendAttachments($client) ?? $messageId;
        }

        if (filled($messageId)) {
            $this->message->update(['source_id' => (string) $messageId]);
        }
    }

    private function textToSend(DeliveryPlan $plan): ?string
    {
        return $plan->level === DeliveryLevel::Native ? ($plan->parts[0]['text'] ?? null) : $plan->plainText();
    }

    private function sendText(TelegramClient $client, DeliveryPlan $plan): int|string|null
    {
        $channel = $this->channel();
        $native = $plan->level === DeliveryLevel::Native ? $plan->parts[0] : null;

        $body = array_filter([
            'chat_id' => $channel->chatId($this->message),
            'text' => $this->textToSend($plan),
            'reply_markup' => filled($native['reply_markup'] ?? null) ? json_encode($native['reply_markup']) : null,
            'parse_mode' => 'HTML',
            'reply_to_message_id' => $this->message->content_attributes['in_reply_to_external_id'] ?? null,
            'business_connection_id' => $channel->businessConnectionId($this->message),
        ], fn ($value) => $value !== null);

        $response = $client->sendMessage($body);

        if (! $this->handleResponse($response)) {
            return null;
        }

        return $response->json('result.message_id');
    }

    private function sendAttachments(TelegramClient $client): int|string|null
    {
        $channel = $this->channel();
        $media = [];
        $documents = [];

        foreach ($this->message->attachments as $attachment) {
            $type = self::TELEGRAM_TYPES[$attachment->fileTypeName()] ?? 'document';
            $entry = ['type' => $type, 'media' => $attachment->downloadUrl()];

            if ($type === 'document') {
                $documents[] = $entry;
            } else {
                $media[] = $entry;
            }
        }

        $base = array_filter([
            'chat_id' => $channel->chatId($this->message),
            'business_connection_id' => $channel->businessConnectionId($this->message),
            'reply_to_message_id' => $this->message->content_attributes['in_reply_to_external_id'] ?? null,
        ], fn ($value) => $value !== null);

        $messageId = null;

        if ($media !== []) {
            $response = $client->sendMediaGroup([...$base, 'media' => json_encode($media)]);

            if (! $this->handleResponse($response)) {
                return null;
            }

            $result = $response->json('result');
            $messageId = is_array($result) && array_is_list($result) ? $result[0]['message_id'] : ($result['message_id'] ?? null);
        }

        foreach ($documents as $document) {
            $response = $client->sendDocument([...$base, 'document' => $document['media']]);

            if (! $this->handleResponse($response)) {
                return $messageId;
            }

            $messageId = $response->json('result.message_id');
        }

        return $messageId;
    }

    /** @var array<string, string> */
    private const TELEGRAM_TYPES = ['audio' => 'audio', 'image' => 'photo', 'file' => 'document', 'video' => 'video'];

    // Channel::Telegram#process_error — Telegram trả 200 kèm ok:false.
    private function handleResponse(Response $response): bool
    {
        if ($response->successful() && $response->json('ok') !== false) {
            return true;
        }

        ChannelMessageStatus::fail($this->message, $response->json('error_code').', '.$response->json('description'));

        return false;
    }
}
