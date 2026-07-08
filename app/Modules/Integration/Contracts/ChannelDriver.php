<?php

namespace App\Modules\Integration\Contracts;

use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Integration\ChannelManager;

/**
 * Contract cho kênh inbox (Zalo, Messenger, TikTok, ...).
 *
 * Inbox core gọi contract này — không biết driver cụ thể.
 * Impl (ZaloChannelDriver, v.v.) đăng ký qua ChannelManager::extend().
 *
 * @see ChannelManager
 */
interface ChannelDriver
{
    /**
     * Key định danh kênh (vd: 'zalo_personal', 'messenger').
     */
    public function channelKey(): string;

    /**
     * Khởi tạo kết nối (QR login, token, v.v.).
     */
    public function connect(string $workspaceId, array $params): void;

    /**
     * Ngắt kết nối / đăng xuất.
     */
    public function disconnect(string $workspaceId): void;

    /**
     * Gửi tin ra kênh từ inbox. Trả về đúng Message vừa ghi — caller KHÔNG
     * được tự query "message out mới nhất" (race khi 2 người gửi song song).
     *
     * @param  array<string, mixed>  $payload  body/media/type theo kênh
     */
    public function sendMessage(Conversation $conversation, array $payload): Message;

    /**
     * Parse raw webhook payload từ bridge thành dạng chuẩn hóa cho inbox core.
     *
     * @param  array<string, mixed>  $raw
     * @return array{
     *   direction: string,
     *   source_id: string,
     *   type: string,
     *   body: string|null,
     *   media_url: string|null,
     *   media_meta: array<string, mixed>,
     *   platform_sent_at: int,
     *   sender_uid: string|null,
     *   sender_name: string|null,
     *   peer_uid: string,
     *   peer_name: string|null,
     *   peer_phone: string|null,
     *   peer_avatar_url: string|null,
     *   thread_type: int,
     * }
     */
    public function parseInbound(array $raw): array;
}
