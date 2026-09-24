<?php

namespace App\Services\Channels;

use App\Models\Conversation;

/**
 * Danh bạ thành viên của một hội thoại NHÓM trên kênh (docs/channel-capabilities.md
 * §2.4 `group_threads`) — nguồn để agent nhắc tên khi trả lời trong nhóm.
 *
 * Lõi chỉ biết hình dạng trung tính `{external_id, name, avatar?}` (trùng
 * `content_attributes.sender` của tin nhóm); cách hỏi nền tảng, cache, bỏ chính tài
 * khoản shop là việc của driver. Thêm kênh = thêm driver + một dòng trong
 * ChannelActionRegistry.
 */
interface ChannelGroupMembers
{
    /** Hội thoại này có phải luồng nhóm không — đọc dữ liệu local, không gọi ra nhà cung cấp. */
    public function isGroup(Conversation $conversation): bool;

    /**
     * Rỗng khi kênh không trả được (mất phiên, nhà cung cấp lỗi) — người gọi vẫn
     * phải chạy tiếp được.
     *
     * @return list<array{external_id: string, name: string, avatar?: string|null}>
     */
    public function members(Conversation $conversation): array;
}
