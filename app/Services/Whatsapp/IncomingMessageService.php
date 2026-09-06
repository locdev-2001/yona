<?php

namespace App\Services\Whatsapp;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Channels\RemoteAttachmentDownloader;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Port từ refs/chatwoot/app/services/whatsapp/incoming_message_base_service.rb
 * (+ whatsapp_cloud_service). Cả hai nhà cung cấp dùng chung một lõi; khác biệt
 * duy nhất là chỗ bóc `value` khỏi payload — đưa vào processedParams().
 */
class IncomingMessageService
{
    /** @var list<string> Kiểu tin Chatwoot bỏ qua. */
    private const UNPROCESSABLE_TYPES = ['reaction', 'ephemeral', 'request_welcome'];

    /** @var list<string> Kiểu tin không mang tệp đính kèm. */
    private const NON_ATTACHMENT_TYPES = ['text', 'button', 'interactive', 'location', 'contacts'];

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $params,
        private readonly bool $outgoingEcho = false,
    ) {}

    public function perform(): ?Message
    {
        $value = $this->processedParams();

        if (filled($value['statuses'] ?? null)) {
            $this->processStatuses($value['statuses'][0]);

            return null;
        }

        $messages = $this->messagesData($value);

        if (blank($messages)) {
            return null;
        }

        return $this->processMessage($messages[0], $value);
    }

    /** @return array<string, mixed> */
    private function processedParams(): array
    {
        // Cloud API bọc trong entry/changes/value; 360dialog gửi phẳng.
        return (array) (data_get($this->params, 'entry.0.changes.0.value') ?? $this->params);
    }

    /**
     * @param  array<string, mixed>  $value
     * @return list<array<string, mixed>>
     */
    private function messagesData(array $value): array
    {
        return (array) ($value['messages'] ?? $value['message_echoes'] ?? []);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $value
     */
    private function processMessage(array $payload, array $value): ?Message
    {
        $type = $payload['type'] ?? null;

        if (in_array($type, self::UNPROCESSABLE_TYPES, true)) {
            return null;
        }

        // Meta gửi trùng webhook cho cùng một tin — source_id là khóa chống trùng.
        if (Message::query()->where('source_id', $payload['id'] ?? '')->exists()) {
            return null;
        }

        if (filled($payload['errors'] ?? null)) {
            Log::warning('[WHATSAPP] '.data_get($payload, 'errors.0.title').' - contact: '.($payload['from'] ?? ''));
        }

        $sourceIdentifier = $this->outgoingEcho ? ($payload['to'] ?? null) : ($payload['from'] ?? null);

        if (blank($sourceIdentifier)) {
            return null;
        }

        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: [
                'name' => data_get($value, 'contacts.0.profile.name') ?: '+'.$sourceIdentifier,
                'phone_number' => '+'.$sourceIdentifier,
            ],
            sourceId: (string) $sourceIdentifier,
        ))->perform();

        if ($contactInbox === null) {
            return null;
        }

        $conversation = IncomingConversationResolver::resolve($contactInbox);

        $message = $conversation->messages()->make([
            'content' => $this->messageContent($payload),
            'account_id' => $this->inbox->account_id,
            'inbox_id' => $this->inbox->id,
            'message_type' => $this->outgoingEcho ? Message::TYPE_OUTGOING : Message::TYPE_INCOMING,
            // Echo đặt sẵn 'delivered' để SendReplyJob không gửi ngược ra ngoài.
            'status' => $this->outgoingEcho ? Message::STATUSES['delivered'] : Message::STATUSES['sent'],
            'source_id' => (string) $payload['id'],
            'content_attributes' => $this->contentAttributes($payload),
        ]);

        if (! $this->outgoingEcho) {
            $message->sender()->associate($contactInbox->contact);
        }

        $message->save();

        $this->attachFiles($message, $payload, $type);
        $this->attachLocation($message, $payload, $type);
        $this->attachContacts($message, $payload, $type);

        return $message;
    }

    /** @param array<string, mixed> $payload */
    private function messageContent(array $payload): ?string
    {
        return data_get($payload, 'text.body')
            ?? data_get($payload, 'button.text')
            ?? data_get($payload, 'interactive.button_reply.title')
            ?? data_get($payload, 'interactive.list_reply.title')
            ?? data_get($payload, 'name.formatted_name');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function contentAttributes(array $payload): array
    {
        $attributes = $this->outgoingEcho ? ['external_echo' => true] : [];

        if (filled(data_get($payload, 'context.id'))) {
            $attributes['in_reply_to_external_id'] = data_get($payload, 'context.id');
        }

        if (filled($payload['referral'] ?? null) && ! $this->outgoingEcho) {
            $attributes['referral'] = $payload['referral'];
        }

        return $attributes;
    }

    /** @param array<string, mixed> $payload */
    private function attachFiles(Message $message, array $payload, ?string $type): void
    {
        if ($type === null || in_array($type, self::NON_ATTACHMENT_TYPES, true)) {
            return;
        }

        $attachmentPayload = (array) ($payload[$type] ?? []);

        if (blank($message->content) && filled($attachmentPayload['caption'] ?? null)) {
            $message->update(['content' => $attachmentPayload['caption']]);
        }

        if (blank($attachmentPayload['id'] ?? null)) {
            return;
        }

        $channel = $this->inbox->channel;
        $mediaUrlResponse = Http::withHeaders($channel->apiHeaders())
            ->get($channel->mediaUrl((string) $attachmentPayload['id']));

        if (! $mediaUrlResponse->successful()) {
            return;
        }

        $attributes = RemoteAttachmentDownloader::download(
            url: (string) $mediaUrlResponse->json('url'),
            accountId: $message->account_id,
            filename: $attachmentPayload['filename'] ?? null,
            headers: $channel->apiHeaders(),
        );

        if ($attributes === null) {
            return;
        }

        $attributes['file_type'] = self::FILE_TYPES[$type] ?? Attachment::FILE_TYPE_FILE;
        $message->attachments()->create($attributes);
    }

    /** @var array<string, int> Whatsapp::IncomingMessageServiceHelpers#file_content_type */
    private const FILE_TYPES = [
        'image' => Attachment::FILE_TYPE_IMAGE,
        'sticker' => Attachment::FILE_TYPE_IMAGE,
        'audio' => Attachment::FILE_TYPE_AUDIO,
        'voice' => Attachment::FILE_TYPE_AUDIO,
        'video' => Attachment::FILE_TYPE_VIDEO,
        'location' => Attachment::FILE_TYPE_LOCATION,
        'contacts' => Attachment::FILE_TYPE_CONTACT,
    ];

    /** @param array<string, mixed> $payload */
    private function attachLocation(Message $message, array $payload, ?string $type): void
    {
        if ($type !== 'location') {
            return;
        }

        $location = (array) $payload['location'];
        $name = filled($location['name'] ?? null) ? "{$location['name']}, ".($location['address'] ?? '') : '';

        $message->attachments()->create([
            'account_id' => $message->account_id,
            'file_type' => Attachment::FILE_TYPE_LOCATION,
            'coordinates_lat' => $location['latitude'],
            'coordinates_long' => $location['longitude'],
            'fallback_title' => mb_substr($name, 0, 255),
            'external_url' => $location['url'] ?? null,
        ]);
    }

    /** @param array<string, mixed> $payload */
    private function attachContacts(Message $message, array $payload, ?string $type): void
    {
        if ($type !== 'contacts') {
            return;
        }

        foreach ($payload['contacts'] ?? [] as $contact) {
            $phones = filled($contact['phones'] ?? null)
                ? $contact['phones']
                : [['phone' => 'Phone number is not available']];

            foreach ($phones as $phone) {
                $message->attachments()->create([
                    'account_id' => $message->account_id,
                    'file_type' => Attachment::FILE_TYPE_CONTACT,
                    'fallback_title' => (string) $phone['phone'],
                    'meta' => array_filter([
                        'firstName' => data_get($contact, 'name.first_name'),
                        'lastName' => data_get($contact, 'name.last_name'),
                    ]),
                ]);
            }
        }
    }

    /** @param array<string, mixed> $status */
    private function processStatuses(array $status): void
    {
        $message = Message::query()->where('source_id', $status['id'] ?? '')->first();

        if ($message === null || ! array_key_exists($status['status'] ?? '', Message::STATUSES)) {
            return;
        }

        $externalError = $status['status'] === 'failed' && filled($status['errors'] ?? null)
            ? data_get($status, 'errors.0.code').': '.data_get($status, 'errors.0.title')
            : null;

        ChannelMessageStatus::markStatus($message, $status['status'], $externalError);
    }
}
