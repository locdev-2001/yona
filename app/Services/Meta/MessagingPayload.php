<?php

namespace App\Services\Meta;

use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\Events\InboundEvent;
use App\Messaging\Inbound\Events\ReactionEvent;
use App\Messaging\Inbound\Events\RecallEvent;
use App\Messaging\Inbound\Events\ReceiptEvent;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundDirection;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\ReplyReference;
use App\Messaging\Stickers\StickerContent;
use Illuminate\Support\Carbon;

/**
 * Một phần tử `messaging`/`standby` của webhook Messenger Platform — Messenger và
 * Instagram dùng chung hình dạng này. Chỉ bóc payload thành giá trị trung tính của lõi;
 * không chạm DB, không tải tệp.
 */
class MessagingPayload
{
    /** @var array<string, string> tên kiểu của Meta → loại đính kèm của lõi */
    private const ATTACHMENT_KINDS = [
        'image' => 'image',
        'video' => 'video',
        'audio' => 'audio',
        'file' => 'file',
        'share' => 'share',
        'story_mention' => 'story_mention',
        'reel' => 'ig_reel',
        'ig_reel' => 'ig_reel',
        'ig_post' => 'ig_post',
        'ig_story' => 'ig_story',
    ];

    /** @var array<string, mixed> */
    protected array $messaging;

    /** @param array<string, mixed> $entry một phần tử `messaging` hoặc `standby` */
    public function __construct(array $entry)
    {
        $this->messaging = $entry['messaging'] ?? $entry['standby'] ?? $entry;
    }

    public function senderId(): ?string
    {
        return $this->stringOrNull(data_get($this->messaging, 'sender.id'));
    }

    public function recipientId(): ?string
    {
        return $this->stringOrNull(data_get($this->messaging, 'recipient.id'));
    }

    public function identifier(): ?string
    {
        return $this->stringOrNull(data_get($this->messaging, 'message.mid'));
    }

    public function content(): ?string
    {
        return data_get($this->messaging, 'message.text');
    }

    public function hasMessage(): bool
    {
        return filled($this->messaging['message'] ?? null);
    }

    public function isEcho(): bool
    {
        return filled(data_get($this->messaging, 'message.is_echo'));
    }

    public function isDeleted(): bool
    {
        return filled(data_get($this->messaging, 'message.is_deleted'));
    }

    /** Payload của chip trả lời nhanh do DeliveryPlanner vẽ. */
    public function quickReplyPayload(): ?string
    {
        return data_get($this->messaging, 'message.quick_reply.payload');
    }

    public function inReplyToExternalId(): ?string
    {
        return $this->stringOrNull(data_get($this->messaging, 'message.reply_to.mid'));
    }

    /** Id của khách trong cuộc trò chuyện: người gửi, hoặc người nhận khi là tin dội lại. */
    public function contactSourceId(): ?string
    {
        return $this->isEcho() ? $this->recipientId() : $this->senderId();
    }

    public function sentAt(): ?Carbon
    {
        $timestamp = $this->messaging['timestamp'] ?? null;

        return is_numeric($timestamp) ? Carbon::createFromTimestampMs((int) $timestamp) : null;
    }

    /** @return list<array<string, mixed>> */
    public function rawAttachments(): array
    {
        return (array) data_get($this->messaging, 'message.attachments', []);
    }

    /**
     * Sticker là đính kèm `image` mang `payload.sticker_id`; URL fbcdn có hạn dùng nên ảnh
     * đi theo đường tải (InboundMessage::$attachments), lõi lấy ảnh đó làm ảnh sticker.
     */
    public function sticker(): ?StickerContent
    {
        foreach ($this->rawAttachments() as $attachment) {
            $stickerId = data_get($attachment, 'payload.sticker_id');

            if (filled($stickerId)) {
                return new StickerContent(id: (string) $stickerId);
            }
        }

        return null;
    }

    /**
     * Meta hay lặp cùng một đính kèm hai lần trong mảng → khử trùng theo kiểu + URL.
     *
     * @return list<InboundAttachment>
     */
    public function attachments(): array
    {
        $specs = [];
        $seen = [];

        foreach ($this->rawAttachments() as $attachment) {
            $type = (string) ($attachment['type'] ?? '');
            $url = $type === 'ig_story'
                ? data_get($attachment, 'payload.story_media_url')
                : (data_get($attachment, 'payload.url') ?? ($attachment['url'] ?? null));
            $key = $type.'|'.($url ?? spl_object_id($this));

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $spec = $this->attachmentSpec($type, $url, $attachment);

            if ($spec !== null) {
                $specs[] = $spec;
            }
        }

        return $specs;
    }

    public function inboundMessage(): InboundMessage
    {
        $replyExternalId = $this->inReplyToExternalId();

        return new InboundMessage(
            sourceId: $this->identifier(),
            direction: $this->isEcho() ? InboundDirection::Echo : InboundDirection::Incoming,
            text: $this->content(),
            sentAt: $this->sentAt(),
            sticker: $this->sticker(),
            attachments: $this->attachments(),
            replyTo: $replyExternalId === null ? null : new ReplyReference($replyExternalId),
        );
    }

    /**
     * Sự kiện lên tin đã có: biên nhận `delivery`/`read` (theo mid hoặc mốc), cảm xúc
     * `reaction` (action `unreact` = gỡ), tin bị thu hồi (`message.is_deleted`, Instagram).
     *
     * @return list<InboundEvent>
     */
    public function events(): array
    {
        $events = [];
        $contactSourceId = $this->senderId();

        $delivery = (array) ($this->messaging['delivery'] ?? []);

        if (filled($delivery['mids'] ?? null)) {
            $events[] = ReceiptEvent::delivered(array_map('strval', (array) $delivery['mids']));
        } elseif (filled($delivery['watermark'] ?? null) && $contactSourceId !== null) {
            $events[] = ReceiptEvent::deliveredUpTo($contactSourceId, Carbon::createFromTimestampMs((int) $delivery['watermark']));
        }

        $readWatermark = data_get($this->messaging, 'read.watermark');

        if (filled($readWatermark) && $contactSourceId !== null) {
            $events[] = ReceiptEvent::readUpTo($contactSourceId, Carbon::createFromTimestampMs((int) $readWatermark));
        }

        $reaction = (array) ($this->messaging['reaction'] ?? []);

        if (filled($reaction['mid'] ?? null) && $contactSourceId !== null) {
            $events[] = new ReactionEvent(
                targetSourceId: (string) $reaction['mid'],
                emoji: ($reaction['action'] ?? 'react') === 'unreact' ? null : ($reaction['emoji'] ?? null),
                actor: $contactSourceId,
            );
        }

        if ($this->isDeleted() && $this->identifier() !== null) {
            $events[] = new RecallEvent($this->identifier());
        }

        return $events;
    }

    public function hasEvents(): bool
    {
        return $this->events() !== [];
    }

    /** @param array<string, mixed> $attachment */
    private function attachmentSpec(string $type, mixed $url, array $attachment): ?InboundAttachment
    {
        if ($type === 'location') {
            $latitude = data_get($attachment, 'payload.coordinates.lat');
            $longitude = data_get($attachment, 'payload.coordinates.long');

            return is_numeric($latitude) && is_numeric($longitude)
                ? InboundAttachment::location((float) $latitude, (float) $longitude, $attachment['title'] ?? null, $url)
                : null;
        }

        if ($type === 'fallback') {
            return InboundAttachment::fallback($attachment['title'] ?? data_get($attachment, 'payload.title'), $url);
        }

        $kind = self::ATTACHMENT_KINDS[$type] ?? null;

        if ($kind === null || blank($url)) {
            return null;
        }

        return InboundAttachment::download((string) $url, AttachmentKind::from($kind));
    }

    private function stringOrNull(mixed $value): ?string
    {
        return $value === null ? null : (string) $value;
    }
}
