<?php

namespace App\Modules\Integration\Data;

use App\Models\Message;

/**
 * Nội dung một tin outbound, độc lập với kênh.
 *
 * Thay cho mảng payload không kiểu. Lệch key giữa caller và driver trước đây là
 * lỗi lúc chạy (automation gửi 'body', driver đọc 'text' → tin rỗng); giờ là lỗi
 * lúc phân tích tĩnh.
 *
 * Ba thành phần độc lập nhau — driver tự quyết định tổ hợp nào có nghĩa với kênh
 * của nó (Zalo: media + caption, sticker + text đều hợp lệ). DTO không áp luật
 * loại trừ; đó là việc của policy kênh.
 */
final readonly class OutboundMessage
{
    /**
     * @param  array<string, mixed>|null  $media
     * @param  array<string, mixed>|null  $sticker
     */
    public function __construct(
        public ?string $text = null,
        public ?array $media = null,
        public ?array $sticker = null,
        public ?Message $replyTo = null,
    ) {}

    public static function text(string $text): self
    {
        return new self(text: $text);
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

    public function withReplyTo(?Message $replyTo): self
    {
        return new self($this->text, $this->media, $this->sticker, $replyTo);
    }

    /** Không có gì để gửi — caller từ chối trước khi chạm driver. */
    public function isEmpty(): bool
    {
        return ($this->text === null || trim($this->text) === '')
            && $this->media === null
            && $this->sticker === null;
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
        ];
    }
}
