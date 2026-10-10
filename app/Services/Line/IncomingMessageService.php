<?php

namespace App\Services\Line;

use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Stickers\StickerContent;
use App\Models\Inbox;
use Illuminate\Support\Carbon;

/**
 * LINE gửi nhiều event trong một webhook — duyệt lần lượt, mỗi event một tin qua lõi.
 */
class IncomingMessageService
{
    private const STICKER_IMAGE_URL = 'https://stickershop.line-scdn.net/stickershop/v1/sticker/%s/android/sticker.png';

    /** @var array<string, string> kiểu message của LINE cần tải nội dung nhị phân về → loại của lõi */
    private const BINARY_KINDS = ['image' => 'image', 'video' => 'video', 'audio' => 'audio', 'file' => 'file'];

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

        $sender = new InboundSender(
            sourceId: (string) $profile['userId'],
            name: $profile['displayName'] ?? null,
            avatarUrl: $profile['pictureUrl'] ?? null,
            additionalAttributes: ['social_line_user_id' => $profile['userId']],
        );

        app(InboundMessageWriter::class)->write($this->inbox, $sender, $this->inboundMessage($event));
    }

    /** @return array<string, mixed> */
    private function fetchProfile(string $userId): array
    {
        $response = (new LineClient($this->inbox->channel))->profile($userId);

        return $response->successful() ? (array) $response->json() : [];
    }

    /** @param array<string, mixed> $event */
    private function inboundMessage(array $event): InboundMessage
    {
        $message = (array) ($event['message'] ?? []);
        $timestamp = $event['timestamp'] ?? null;

        return new InboundMessage(
            sourceId: (string) ($message['id'] ?? ''),
            text: ($message['type'] ?? null) === 'text' ? ($message['text'] ?? null) : null,
            sentAt: is_numeric($timestamp) ? Carbon::createFromTimestampMs((int) $timestamp) : null,
            sticker: $this->sticker($message),
            attachments: $this->attachments($message),
        );
    }

    /**
     * Ảnh sticker trỏ CDN LINE theo mã, không đổi nên khỏi tải về đĩa.
     *
     * @param  array<string, mixed>  $message
     */
    private function sticker(array $message): ?StickerContent
    {
        $stickerId = $message['stickerId'] ?? null;

        if (($message['type'] ?? null) !== 'sticker' || blank($stickerId)) {
            return null;
        }

        return new StickerContent(
            id: (string) $stickerId,
            imageUrl: sprintf(self::STICKER_IMAGE_URL, $stickerId),
            packId: $message['packageId'] ?? null,
        );
    }

    /**
     * API nội dung của LINE cần channel token nên URL không đưa ra ngoài được.
     *
     * @param  array<string, mixed>  $message
     * @return list<InboundAttachment>
     */
    private function attachments(array $message): array
    {
        $kind = self::BINARY_KINDS[$message['type'] ?? ''] ?? null;

        if ($kind === null) {
            return [];
        }

        $client = new LineClient($this->inbox->channel);

        return [InboundAttachment::download(
            $client->messageContentUrl((string) $message['id']),
            AttachmentKind::from($kind),
            $message['fileName'] ?? null,
            headers: $client->authHeaders(),
        )];
    }
}
