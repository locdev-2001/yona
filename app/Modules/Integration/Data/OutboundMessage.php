<?php

namespace App\Modules\Integration\Data;

use App\Models\Message;
use App\Modules\Chat\Delivery\Event\OutboundEvent;
use App\Modules\Chat\Delivery\Event\TextEvent;

/**
 * Nội dung một tin outbound, độc lập với kênh.
 *
 * Thay cho mảng payload không kiểu. Lệch key giữa caller và driver trước đây là
 * lỗi lúc chạy (automation gửi 'body', driver đọc 'text' → tin rỗng); giờ là lỗi
 * lúc phân tích tĩnh.
 *
 * DẠNG CHUẨN là `events` — danh sách sự kiện (chữ, ảnh, thẻ, nút, ô nhập). Ba
 * trường `text`/`media`/`sticker` là đường tắt cho kênh chỉ hiểu chữ và ảnh;
 * chúng được dẫn xuất từ events chứ không phải nguồn thứ hai.
 *
 * Driver tự quyết tổ hợp nào có nghĩa với kênh của nó (Zalo: media + caption,
 * sticker + text đều hợp lệ). DTO không áp luật loại trừ; đó là việc của policy
 * kênh. Sự kiện kênh không render được thì ADAPTER hạ cấp — không phải lõi lọc.
 */
final readonly class OutboundMessage
{
    /**
     * @param  list<OutboundEvent>  $events
     * @param  array<string, mixed>|null  $media
     * @param  array<string, mixed>|null  $sticker
     */
    public function __construct(
        public ?string $text = null,
        public ?array $media = null,
        public ?array $sticker = null,
        public ?Message $replyTo = null,
        public array $events = [],
    ) {}

    public static function text(string $text): self
    {
        return new self(text: $text, events: [new TextEvent($text)]);
    }

    /** @param array<string, mixed> $media */
    public static function media(array $media, ?string $caption = null): self
    {
        return new self(text: $caption, media: $media);
    }

    /** @param array<string, mixed> $sticker */
    public static function sticker(array $sticker): self
    {
        return new self(sticker: $sticker);
    }

    /**
     * Dạng chuẩn: dựng từ danh sách sự kiện.
     *
     * `text` được rút ra bằng cách ghép chữ thuần của các sự kiện — kênh chỉ hiểu
     * chữ vẫn gửi được thứ gì đó có nghĩa thay vì tin rỗng.
     *
     * @param  list<OutboundEvent>  $events
     */
    public static function events(array $events): self
    {
        $flat = OutboundEvent::flatten($events);

        return new self(text: $flat === '' ? null : $flat, events: $events);
    }

    public function withReplyTo(?Message $replyTo): self
    {
        return new self($this->text, $this->media, $this->sticker, $replyTo, $this->events);
    }

    /** Không có gì để gửi — caller từ chối trước khi chạm driver. */
    public function isEmpty(): bool
    {
        return ($this->text === null || trim($this->text) === '')
            && $this->media === null
            && $this->sticker === null
            && $this->events === [];
    }

    /**
     * Shape mà ChannelDriver::sendMessage() đang nhận.
     *
     * Cầu tạm trong lúc contract driver còn nhận mảng — gỡ khi driver đổi sang
     * nhận thẳng DTO.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'text' => $this->text,
            'media' => $this->media,
            'sticker' => $this->sticker,
            'reply_to' => $this->replyTo,
            'events' => OutboundEvent::listToArray($this->events),
        ];
    }
}
