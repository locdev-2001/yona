<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Builders\Messages\MessageBuilder;
use App\Channels\Capability;
use App\Models\Message;
use App\Services\Channels\Stickers\StickerLibrary;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.2 outbound_sticker — agent chọn sticker từ danh mục của kênh bằng `id` trung
 * tính; lõi tự dựng tin (content_type sticker + đính kèm ảnh) và driver phải mang
 * đúng sticker đó ra nền tảng.
 */
final class OutboundStickerContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::OutboundSticker;
    }

    public function assert(ChannelHarness $harness): void
    {
        $sticker = app(StickerLibrary::class)->browse($harness->inbox(), 'chào', null)['stickers'][0] ?? null;
        expect($sticker)->not->toBeNull();

        $message = (new MessageBuilder(null, $harness->conversation(), [
            'content_type' => 'sticker',
            'sticker_id' => $sticker['id'],
        ]))->perform();

        expect($message->content_type)->toBe(Message::CONTENT_TYPES['sticker'])
            ->and($message->attachments->first()?->external_url)->toBe($sticker['image_url'])
            // Bản trong bộ nhớ chưa biết source_id mà lượt gửi tự động vừa ghi — đọc lại trước khi xoá dấu vết.
            ->and($harness->sendOutbound($this->readyToSend($message->fresh()))->flattened())->toContain($sticker['id']);
    }
}
