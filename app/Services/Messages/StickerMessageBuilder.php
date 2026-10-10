<?php

namespace App\Services\Messages;

use App\Channels\Capability;
use App\Exceptions\MessageValidationException;
use App\Messaging\Stickers\StickerContent;
use App\Messaging\Stickers\StickerMessage;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\Stickers\StickerCatalogException;
use App\Services\Channels\Stickers\StickerLibrary;

/**
 * Tin `content_type: sticker` do agent gửi, hoặc khách gửi từ bề mặt của kênh
 * khai `inbound_sticker` (widget website): client chỉ đưa `sticker_id`, máy chủ
 * tra danh mục sở hữu mã rồi tự dựng tin theo đúng hình dạng sticker nhận về —
 * rồi ghi theo hình dạng chung của lõi (App\Messaging\Stickers\StickerMessage) với
 * payload của danh mục và một đính kèm ảnh do chính danh mục dựng.
 *
 * Sticker đi một mình: không ghi chú riêng, không kèm tệp, không trích dẫn.
 */
final class StickerMessageBuilder
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Message $message,
        private readonly Inbox $inbox,
        private readonly array $params,
    ) {}

    public function perform(): void
    {
        if ($this->message->content_type !== Message::CONTENT_TYPES['sticker']) {
            return;
        }

        $this->guardStandalone();

        $library = app(StickerLibrary::class);

        try {
            $sticker = $library->resolve($this->inbox, $this->stickerId(), $this->direction());
            $attachment = $library->attachmentFor($this->inbox, $sticker, $this->direction());
        } catch (StickerCatalogException $exception) {
            throw new MessageValidationException($exception->getMessage());
        }

        StickerMessage::apply($this->message, StickerContent::fromPayload($sticker->payload), $attachment);
    }

    private function guardStandalone(): void
    {
        if ($this->message->private) {
            $this->reject('private_note');
        }

        if (! $this->isOutgoing() && ! $this->inbox->supports(Capability::InboundSticker)) {
            $this->reject('outgoing_only');
        }

        if (filled($this->params['attachments'] ?? null)) {
            $this->reject('with_attachments');
        }
    }

    private function isOutgoing(): bool
    {
        return $this->message->message_type === Message::TYPE_OUTGOING;
    }

    private function direction(): Capability
    {
        return $this->isOutgoing() ? Capability::OutboundSticker : Capability::InboundSticker;
    }

    private function stickerId(): string
    {
        $stickerId = $this->params['sticker_id'] ?? null;
        $stickerId = is_scalar($stickerId) ? trim((string) $stickerId) : '';

        if ($stickerId === '') {
            $this->reject('missing_sticker_id');
        }

        return $stickerId;
    }

    private function reject(string $reason): never
    {
        throw new MessageValidationException(__("errors.stickers.{$reason}", [], $this->inbox->account->locale));
    }
}
