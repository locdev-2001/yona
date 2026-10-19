<?php

namespace App\Models\Channel;

use App\Channels\AddressesContacts;
use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelConnection;
use App\Channels\ChannelPlatform;
use App\Channels\ConnectionMethod;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresConnection;
use App\Channels\DeclaresPlatform;
use App\Channels\TextFormat;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Contact;
use Database\Factories\Channel\YonaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Kênh nhắn tin giữa người dùng Yona. Liên hệ của kênh là một người dùng Yona khác,
// địa chỉ liên hệ (source_id) là "yona:{user_id}". Mỗi account có đúng một kênh này,
// tạo tự động cùng hộp thư cá nhân.
class Yona extends Model implements AddressesContacts, DeclaresCapabilities, DeclaresConnection, DeclaresPlatform
{
    /** @use HasFactory<YonaFactory> */
    use Channelable, HasFactory;

    public const CONTACT_SOURCE_PREFIX = 'yona:';

    public const MESSAGE_SOURCE_PREFIX = 'yona-msg:';

    public const EDITABLE_ATTRS = [];

    protected $table = 'channel_yona';

    protected $fillable = ['account_id'];

    public function name(): string
    {
        return 'Yona';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('yona', 'Yona');
    }

    public static function channelRules(): array
    {
        return [];
    }

    // Có sẵn cho mọi hộp thư, không mở từ màn "Thêm kênh".
    public static function connection(): ChannelConnection
    {
        return ChannelConnection::of('yona', ConnectionMethod::Form)->ordered(0)->available(false);
    }

    public static function contactSourceIdFor(int $userId): string
    {
        return self::CONTACT_SOURCE_PREFIX.$userId;
    }

    public static function userIdFromSourceId(?string $sourceId): ?int
    {
        return $sourceId !== null && str_starts_with($sourceId, self::CONTACT_SOURCE_PREFIX)
            ? (int) substr($sourceId, strlen(self::CONTACT_SOURCE_PREFIX))
            : null;
    }

    public function contactSourceId(Contact $contact): string
    {
        return (string) ($contact->contactInboxes()->where('inbox_id', $this->inbox?->id)->value('source_id') ?? '');
    }

    public function capabilities(): CapabilitySet
    {
        return CapabilitySet::of(
            Capability::InboundText,
            Capability::InboundImage,
            Capability::InboundGif,
            Capability::InboundVideo,
            Capability::InboundAudio,
            Capability::InboundFile,
            Capability::InboundCaption,
            Capability::InboundSticker,
            Capability::InboundForward,
            Capability::InboundReplyTo,
            Capability::OutboundText,
            Capability::OutboundImage,
            Capability::OutboundVideo,
            Capability::OutboundAudio,
            Capability::OutboundFile,
            Capability::OutboundSticker,
            Capability::OutboundReaction,
            Capability::OutboundRecall,
            Capability::OutboundReplyTo,
            Capability::EventReaction,
            Capability::EventRecall,
            Capability::ConversationOutboundStart,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
        )->withTextFormat(TextFormat::Markdown);
    }
}
