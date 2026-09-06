<?php

namespace App\Services\Line;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;

/**
 * Port từ refs/chatwoot/app/services/line/incoming_message_service.rb.
 * LINE gửi nhiều event trong một webhook — duyệt lần lượt.
 */
class IncomingMessageService
{
    private const STICKER_IMAGE_URL = 'https://stickershop.line-scdn.net/stickershop/v1/sticker/%s/android/sticker.png';

    /** @var list<string> Kiểu message của LINE cần tải nội dung nhị phân về. */
    private const BINARY_TYPES = ['image', 'video', 'audio', 'file'];

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $params,
    ) {}

    public function perform(): void
    {
        foreach ($this->params['events'] ?? [] as $event) {
            $this->processEvent($event);
        }
    }

    /** @param array<string, mixed> $event */
    private function processEvent(array $event): void
    {
        if (! in_array($event['type'] ?? null, ['message', 'sticker'], true)) {
            return;
        }

        $profile = $this->fetchProfile((string) data_get($event, 'source.userId'));

        if (blank($profile['userId'] ?? null)) {
            return;
        }

        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: [
                'name' => $profile['displayName'] ?? null,
                'avatar_url' => $profile['pictureUrl'] ?? null,
                'additional_attributes' => ['social_line_user_id' => $profile['userId']],
            ],
            sourceId: (string) $profile['userId'],
        ))->perform();

        if ($contactInbox === null) {
            return;
        }

        $conversation = IncomingConversationResolver::resolve($contactInbox);

        $message = $conversation->messages()->make([
            'content' => $this->messageContent($event),
            'account_id' => $this->inbox->account_id,
            'inbox_id' => $this->inbox->id,
            'content_type' => Message::CONTENT_TYPES[$this->messageContentType($event)],
            'message_type' => Message::TYPE_INCOMING,
            'source_id' => (string) data_get($event, 'message.id'),
        ]);
        $message->sender()->associate($contactInbox->contact);
        $message->save();

        $this->attachFile($message, (array) ($event['message'] ?? []));
    }

    /** @return array<string, mixed> */
    private function fetchProfile(string $userId): array
    {
        $response = (new LineClient($this->inbox->channel))->profile($userId);

        return $response->successful() ? (array) $response->json() : [];
    }

    /** @param array<string, mixed> $event */
    private function messageContent(array $event): ?string
    {
        return match (data_get($event, 'message.type')) {
            'text' => data_get($event, 'message.text'),
            // Chatwoot chưa hiển thị sticker: nhúng ảnh sticker bằng markdown.
            'sticker' => sprintf(
                '![sticker-%s](%s)',
                data_get($event, 'message.stickerId'),
                sprintf(self::STICKER_IMAGE_URL, data_get($event, 'message.stickerId')),
            ),
            default => null,
        };
    }

    /** @param array<string, mixed> $event */
    private function messageContentType(array $event): string
    {
        return data_get($event, 'message.type') === 'sticker' ? 'sticker' : 'text';
    }

    /** @param array<string, mixed> $lineMessage */
    private function attachFile(Message $message, array $lineMessage): void
    {
        if (! in_array($lineMessage['type'] ?? null, self::BINARY_TYPES, true)) {
            return;
        }

        $response = (new LineClient($this->inbox->channel))->messageContent((string) $lineMessage['id']);

        if (! $response->successful()) {
            return;
        }

        $contentType = trim(explode(';', (string) $response->header('Content-Type'))[0]) ?: 'application/octet-stream';
        $extension = str_contains($contentType, '/') ? explode('/', $contentType)[1] : 'bin';

        $attributes = Attachment::storeContents(
            $response->body(),
            $lineMessage['fileName'] ?? "media-{$lineMessage['id']}.{$extension}",
            $contentType,
            $message->account_id,
        );

        $message->attachments()->create($attributes);
    }
}
