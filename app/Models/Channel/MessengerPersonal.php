<?php

namespace App\Models\Channel;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelConnection;
use App\Channels\ChannelPlatform;
use App\Channels\ConnectionMethod;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresConnection;
use App\Channels\DeclaresPlatform;
use App\Channels\LabelsEveryoneMention;
use App\Channels\NamesInboxAfterAccount;
use App\Channels\TextFormat;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Conversation;
use App\Services\MessengerPersonal\BridgeClient;
use App\Services\MessengerPersonal\MessengerChat;
use Illuminate\Database\Eloquent\Model;

/**
 * Kênh Messenger cá nhân: tài khoản Facebook của chính chủ hộp thư, nối qua sidecar
 * (services/messenger-bridge). Mọi lời gọi ra sidecar nằm ở BridgeClient; model không
 * nói chuyện HTTP. `id` của bản ghi là `connection_id` sidecar dùng làm khoá slot.
 */
class MessengerPersonal extends Model implements DeclaresCapabilities, DeclaresConnection, DeclaresPlatform, LabelsEveryoneMention, NamesInboxAfterAccount
{
    use Channelable;

    /** Trần một tệp gửi ra: chặn lúc đính kèm và là mức sidecar phải tải được. */
    public const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

    public const STATE_LOGIN_PENDING = 'login_pending';

    public const STATE_CONNECTED = 'connected';

    public const STATE_SESSION_LOST = 'session_lost';

    /** Chủ hộp thư chủ động ngắt — khác mất phiên ngoài ý muốn. */
    public const STATE_DISCONNECTED = 'disconnected';

    /** Hồ sơ liên hệ của một nhóm Messenger đánh dấu bằng khoá này trong additional_attributes. */
    public const CONTACT_CHAT_KIND_ATTRIBUTE = 'messenger_chat_kind';

    /** Khoá trong additional_attributes của hội thoại giữ `chat` của hợp đồng sidecar. */
    public const CONVERSATION_CHAT_ATTRIBUTE = 'messenger_chat';

    /** @var list<string> */
    public const EDITABLE_ATTRS = [];

    protected $table = 'channel_messenger_personal';

    protected $fillable = [
        'account_id',
        'facebook_user_id',
        'display_name',
        'state',
        'login_token',
        'session_lost_reason',
        'last_connected_at',
        'last_session_lost_at',
        'last_login_at',
    ];

    protected $attributes = [
        'state' => self::STATE_LOGIN_PENDING,
    ];

    protected $casts = [
        'last_connected_at' => 'datetime',
        'last_session_lost_at' => 'datetime',
        'last_login_at' => 'datetime',
    ];

    public function name(): string
    {
        return 'Messenger';
    }

    /** Chữ Messenger hiện cho mục nhắc cả nhóm. */
    public function everyoneMentionLabel(): string
    {
        return __('inbox_mgmt.MESSENGER_PERSONAL.EVERYONE_MENTION_LABEL');
    }

    public function accountDisplayName(): ?string
    {
        return filled($this->display_name) ? $this->display_name : null;
    }

    /** Tên hộp thư mặc định là tên tài khoản (InboxNaming), nên form tạo không bắt nhập tên. */
    public static function namesInboxItself(): bool
    {
        return true;
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('messenger', 'Messenger');
    }

    /** Danh tính tài khoản đến từ lượt đăng nhập, người dùng không khai gì lúc tạo kênh. */
    public static function channelRules(): array
    {
        return [];
    }

    /**
     * Xoá hộp thư phải trả slot ở sidecar, nếu không phiên Facebook sống mãi trên máy chủ.
     * Best-effort: sidecar chết không được chặn người dùng xoá.
     */
    protected static function booted(): void
    {
        static::deleting(function (self $channel) {
            $channel->releaseBridgeSession();
        });
    }

    public function releaseBridgeSession(): void
    {
        $bridge = app(BridgeClient::class);

        if (filled($this->login_token)) {
            $bridge->cancelLogin((string) $this->login_token);
        }

        $bridge->logout($this);
    }

    public function isConnected(): bool
    {
        return $this->state === self::STATE_CONNECTED;
    }

    /** Contract lõi `reauthorization_required`: sidebar, thẻ hội thoại và trang cấu hình cùng cảnh báo. */
    public function reauthorizationRequired(): bool
    {
        return ! $this->isConnected();
    }

    public function connectionId(): int
    {
        return (int) $this->id;
    }

    /** Cuộc trò chuyện ở phía Messenger mà một hội thoại Yona trỏ tới. */
    public function chatOf(Conversation $conversation): ?MessengerChat
    {
        return MessengerChat::ofConversation($conversation);
    }

    /** Trạng thái phiên do webhook `session`, nhịp tim hoặc lượt đăng nhập báo về. */
    public function markState(string $state, ?string $reason = null): void
    {
        $attributes = ['state' => $state];

        if ($state === self::STATE_CONNECTED) {
            $attributes['last_connected_at'] = now();
            $attributes['session_lost_reason'] = null;
        } elseif ($state === self::STATE_SESSION_LOST) {
            $attributes['last_session_lost_at'] = now();
            $attributes['session_lost_reason'] = $reason === null ? null : mb_substr($reason, 0, 512);
        } elseif ($state === self::STATE_LOGIN_PENDING) {
            $attributes['last_login_at'] = now();
        } elseif ($state === self::STATE_DISCONNECTED) {
            $attributes['session_lost_reason'] = $reason;
        }

        $this->update($attributes);
    }

    public static function connection(): ChannelConnection
    {
        return ChannelConnection::of('messenger_personal', ConnectionMethod::Credentials)->ordered(15);
    }

    /**
     * Khai theo đường thực thi đã có (App\Services\MessengerPersonal\*). Chưa khai:
     * outbound_sticker/edit, nhắc cả nhóm, mở chat mới, tạo nhóm, bình chọn từ Yona (phase sau; thẻ thăm
     * dò nhận vào thì đi khoá `content_attributes.poll`, không cần năng lực riêng);
     * outbound_read_receipt: lõi chưa có lúc nào gọi driver báo "đã đọc".
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
            Capability::InboundLinkPreview,
            Capability::InboundReplyTo,
            Capability::InboundCallLog,
            Capability::OutboundText,
            Capability::OutboundImage,
            Capability::OutboundVideo,
            Capability::OutboundFile,
            Capability::OutboundReplyTo,
            Capability::OutboundMention,
            Capability::OutboundMentionAll,
            Capability::OutboundReaction,
            Capability::OutboundRecall,
            Capability::OutboundTyping,
            Capability::OutboundRetry,
            Capability::EventDelivered,
            Capability::EventSeen,
            Capability::EventReaction,
            Capability::EventRecall,
            Capability::EventEdit,
            Capability::EventTyping,
            Capability::GroupThreads,
            Capability::ThreadingContinuous,
            Capability::ConversationOutboundResume,
            Capability::SessionReauth,
            Capability::SessionDisconnect,
            Capability::Health,
            Capability::IdentityStableId,
            Capability::ProfileName,
            Capability::ProfileAvatar,
        )->withTextFormat(TextFormat::Plain)->withMaxAttachmentBytes(self::MAX_ATTACHMENT_BYTES);
    }
}
