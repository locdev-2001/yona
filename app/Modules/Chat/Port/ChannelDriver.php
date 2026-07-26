<?php

namespace App\Modules\Chat\Port;

use App\Models\Conversation;
use App\Models\Message;

/**
 * Contract cho kênh inbox (Zalo, Messenger, TikTok, ...).
 *
 * Inbox core gọi contract này — không biết driver cụ thể.
 * Impl (ZaloChannelDriver, v.v.) đăng ký qua ChannelRegistry::extend().
 *
 * @see ChannelRegistry
 */
interface ChannelDriver
{
    /**
     * Danh tính của kênh — tên, nhãn, ký hiệu, quyền quản trị, trang kết nối.
     *
     * `AbstractChannelDriver` CỐ Ý không cho mặc định: đây là thứ duy nhất mỗi
     * phích cắm bắt buộc phải tự khai. Có mặc định là mở đường cho một kênh
     * chạy được mà không có danh tính, rồi giao diện hiện ô trống.
     */
    public function descriptor(): ChannelDescriptor;

    /**
     * Khởi tạo kết nối (QR login, token, v.v.).
     */
    public function connect(string $workspaceId, array $params): void;

    /**
     * Ngắt kết nối / đăng xuất.
     */
    public function disconnect(string $workspaceId): void;

    /**
     * P11 — feature flags của kênh (UI ẩn/hiện nút theo flags, additive-only).
     */
    public function capabilities(): ChannelCapabilities;

    /**
     * Gửi tin ra kênh từ inbox: POLICY kênh (cửa sổ giờ/cap ToS — driver-owned)
     * + TRANSPORT + persist Message. Trả về đúng Message vừa ghi — caller KHÔNG
     * được tự query "message out mới nhất" (race khi 2 người gửi song song).
     *
     * ĐÓNG BĂNG P11 (BLK-4): KHÔNG metering trong driver — meterReply sống ở
     * DeliveryPipeline (core). Mọi kênh (cả mock) ĐI QUA pipeline.
     *
     * @param  array<string, mixed>  $payload  body/media/type theo kênh
     */
    public function sendMessage(Conversation $conversation, array $payload): Message;

    /**
     * Parse raw webhook payload từ bridge thành dạng chuẩn hóa cho inbox core
     * (shape ĐÚNG cái IntakeService::ingest consume — P11 review MED-2 sync).
     *
     * CHƯA FREEZE (MED-4/C6): contract inbound đóng băng ở kênh thật thứ 2.
     * `channel` BẮT BUỘC (thiếu → ingest throw — không fallback im lặng).
     * `platform_meta`: subset raw platform đủ cho quote/reaction/seen — kênh không
     * có tương tác thì trả [] (UI tự disable theo `quotable`).
     *
     * @param  array<string, mixed>  $raw
     * @return array{
     *   channel: string,
     *   channel_account_id: string|null,
     *   peer_uid: string,
     *   peer_name: string|null,
     *   peer_avatar: string|null,
     *   peer_phone: string|null,
     *   thread_kind: string,
     *   direction: string,
     *   source_id: string|null,
     *   type: string,
     *   body: string|null,
     *   media_url: string|null,
     *   media_meta: array<string, mixed>,
     *   platform_sent_at: string|null,
     *   sender_uid: string|null,
     *   sender_name: string|null,
     *   sent_by: int|null,
     *   platform_meta: array<string, mixed>,
     * }
     */
    public function parseInbound(array $raw): array;
}
