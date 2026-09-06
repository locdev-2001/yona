<?php

namespace App\Models\Channel;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\DeclaresCapabilities;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Message;
use Database\Factories\Channel\ZaloFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Kênh Zalo cá nhân (G1) — port từ App\Models\ZaloConnection của nhánh `main`.
 * Mọi lời gọi ra bridge nằm ở App\Services\Zalo\ZaloBridgeClient; model không
 * nói chuyện HTTP (docs/code-standards.md §0).
 *
 * `id` của bản ghi này chính là `connection_id` mà bridge dùng làm khóa slot.
 */
class Zalo extends Model implements DeclaresCapabilities
{
    /** @use HasFactory<ZaloFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_zalo';

    public const STATE_QR_WAITING = 'qr_waiting';

    public const STATE_CONNECTED = 'connected';

    public const STATE_SESSION_LOST = 'session_lost';

    /** @var list<string> */
    public const EDITABLE_ATTRS = [];

    protected $fillable = [
        'account_id',
        'zalo_uid',
        'display_name',
        'phone',
        'state',
        'qr_token',
        'session_lost_reason',
        'last_connected_at',
        'last_session_lost_at',
        'last_qr_at',
    ];

    protected $attributes = [
        'state' => self::STATE_QR_WAITING,
    ];

    protected $casts = [
        'last_connected_at' => 'datetime',
        'last_session_lost_at' => 'datetime',
        'last_qr_at' => 'datetime',
    ];

    public function name(): string
    {
        return 'Zalo';
    }

    /**
     * Người dùng cuối KHÔNG khai số/token kỹ thuật khi tạo kênh — danh tính tài
     * khoản đến từ lần quét QR (lệnh founder trong brief đợt D3/D4).
     */
    public static function channelRules(): array
    {
        return [];
    }

    public function isConnected(): bool
    {
        return $this->state === self::STATE_CONNECTED;
    }

    /** Khóa slot phía bridge — cùng giá trị với khóa chính của bảng. */
    public function connectionId(): int
    {
        return (int) $this->id;
    }

    /**
     * `thread_id` + `thread_type` của Zalo nằm trong additional_attributes của hội
     * thoại (do IncomingMessageService ghi), giống cách Telegram giữ `chat_id`.
     */
    public function threadId(Message $message): ?string
    {
        $threadId = $message->conversation->additional_attributes['thread_id'] ?? null;

        return $threadId === null ? $message->conversation->contactInbox?->source_id : (string) $threadId;
    }

    public function threadType(Message $message): int
    {
        return (int) ($message->conversation->additional_attributes['thread_type'] ?? 0);
    }

    /** Trạng thái phiên do webhook `bridge_session` của bridge đẩy về. */
    public function markState(string $state, ?string $reason = null): void
    {
        $attributes = ['state' => $state];

        if ($state === self::STATE_CONNECTED) {
            $attributes['last_connected_at'] = now();
            $attributes['session_lost_reason'] = null;
        } elseif ($state === self::STATE_SESSION_LOST) {
            $attributes['last_session_lost_at'] = now();
            $attributes['session_lost_reason'] = $reason;
        } elseif ($state === self::STATE_QR_WAITING) {
            $attributes['last_qr_at'] = now();
        }

        $this->update($attributes);
    }

    /**
     * Zalo cá nhân — khai theo trạng thái driver hôm nay (App\Services\Zalo\*).
     * Chưa khai: outbound media (SendOnZaloService mới gửi đính kèm ĐẦU TIÊN, nợ lô 3),
     * outbound_reaction/recall (nợ lô 4), group_threads (nợ Q3), friend_request (nợ Q7).
     */
    public function capabilities(): CapabilitySet
    {
        return CapabilitySet::of(
            Capability::InboundText,
            Capability::InboundImage,
            Capability::InboundGif,
            Capability::InboundVideo,
            Capability::InboundAudio,
            Capability::InboundFile,
            Capability::InboundSticker,
            Capability::InboundLocation,
            Capability::InboundContactCard,
            Capability::InboundBankCard,
            Capability::InboundReminder,
            Capability::InboundCallLog,
            Capability::InboundLinkPreview,
            Capability::InboundCaption,
            Capability::OutboundText,
            Capability::OutboundSticker,
            Capability::OutboundReplyTo,
            Capability::EventDelivered,
            Capability::EventSeen,
            Capability::EventReaction,
            Capability::EventRecall,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::ProfileRefresh,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionQr,
            Capability::SessionReauth,
            Capability::Health,
        );
    }
}
