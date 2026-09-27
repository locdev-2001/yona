<?php

namespace App\Services\Channels\Stickers;

use App\Models\Attachment;
use App\Models\Inbox;

/**
 * Danh mục sticker của một kênh (docs/channel-capabilities.md §2.2
 * `outbound_sticker`). Lõi chỉ nói chuyện qua contract này; cách hỏi nền tảng,
 * cache, hình dạng payload gửi đi là việc của driver. Thêm kênh = thêm driver +
 * một dòng trong ChannelActionRegistry. Kho sticker của Yona cũng là một danh
 * mục theo contract này, ghép vào ở StickerLibrary.
 *
 * Lỗi phía nền tảng ném StickerCatalogException với mã ổn định.
 */
interface StickerCatalog
{
    /** @return list<Sticker> */
    public function search(Inbox $inbox, string $query): array;

    /** @return list<Sticker> */
    public function pack(Inbox $inbox, string $packId): array;

    /** Null khi nền tảng không có sticker mang mã này. */
    public function find(Inbox $inbox, string $stickerId): ?Sticker;

    /**
     * Dựng lại sticker từ `content_attributes.sticker` đã lưu (tin nhận về hoặc
     * gửi đi). Driver được phép ghi nhớ kết quả để `find()` sau đó khỏi hỏi lại
     * nền tảng — agent hay gửi lại đúng sticker vừa thấy.
     *
     * @param  array<string, mixed>  $stored
     */
    public function fromStored(array $stored): ?Sticker;

    /**
     * Đính kèm ảnh của tin sticker (chưa lưu). Đây là thứ mọi kênh không có
     * sticker gốc gửi đi như một tin ảnh, nên driver tự chọn nguồn ảnh: URL của
     * nền tảng hay tệp của kho.
     */
    public function attachmentFor(Sticker $sticker, Inbox $inbox): Attachment;
}
