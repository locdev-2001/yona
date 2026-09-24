<?php

namespace App\Services\Telegram;

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

        if (filled($this->message->content)) {
            $messageId = $this->sendText($client);
        }

        if ($this->message->attachments()->exists()) {
            $messageId = $this->sendAttachments($client) ?? $messageId;
        }

        if (filled($messageId)) {
            $this->message->update(['source_id' => (string) $messageId]);
        }
    }

    private function sendText(TelegramClient $client): int|string|null
    {
        $channel = $this->channel();

        $body = array_filter([
            'chat_id' => $channel->chatId($this->message),
            'text' => $this->message->outgoingContent(),
            'reply_markup' => $this->replyMarkup(),
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

    private function replyMarkup(): ?string
    {
        if ($this->message->contentTypeName() !== 'input_select') {
            return null;
        }

        return json_encode([
            'one_time_keyboard' => true,
            'inline_keyboard' => array_map(
                fn (array $item) => [['text' => $item['title'], 'callback_data' => $item['value']]],
                $this->message->content_attributes['items'] ?? [],
            ),
        ]);
    }

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
