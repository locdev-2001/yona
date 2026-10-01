<?php

namespace App\Models\Channel;

use App\Builders\ContactInboxWithContactBuilder;
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
use App\Models\Concerns\Reauthorizable;
use App\Models\ContactInbox;
use Database\Factories\Channel\FacebookPageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Subscribe/unsubscribe (gem facebook-messenger) nằm ở App\Services\Facebook\PageSubscriptionService.
class FacebookPage extends Model implements DeclaresCapabilities, DeclaresConnection, DeclaresPlatform
{
    /** @use HasFactory<FacebookPageFactory> */
    use Channelable, HasFactory, Reauthorizable;

    public const AUTHORIZATION_ERROR_THRESHOLD = 10;

    protected $table = 'channel_facebook_pages';

    protected $fillable = [
        'account_id', 'page_id', 'user_access_token', 'page_access_token', 'instagram_id',
    ];

    protected function casts(): array
    {
        return [
            'user_access_token' => 'encrypted',
            'page_access_token' => 'encrypted',
        ];
    }

    public function name(): string
    {
        return 'Facebook';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('messenger', 'Messenger');
    }

    public static function channelRules(): array
    {
        return [
            'page_id' => ['required', 'string', 'max:255'],
            'page_access_token' => ['required', 'string'],
            'user_access_token' => ['required', 'string'],
        ];
    }

    public function createContactInbox(string $sourceId, ?string $name): ?ContactInbox
    {
        return (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: ['name' => $name],
            sourceId: $sourceId,
        ))->perform();
    }

    /** Đăng nhập Meta bằng SDK (cửa sổ bật lên) — cần app Meta của bản cài đặt. */
    public static function connection(): ChannelConnection
    {
        return ChannelConnection::of('facebook', ConnectionMethod::OauthPopup)
            ->ordered(70)
            ->available(filled(config('services.facebook.app_id')) && filled(config('services.facebook.app_secret')));
    }

    /** Messenger: biên nhận delivered/seen của Meta chưa được xử lý (nợ có tên). */
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
            Capability::OutboundText,
            Capability::OutboundImage,
            Capability::OutboundVideo,
            Capability::OutboundAudio,
            Capability::OutboundFile,
            Capability::OutboundReplyTo,
            Capability::OutboundQuickReply,
            Capability::OutboundButtons,
            Capability::OutboundCard,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionOauth,
            Capability::SessionReauth,
            Capability::SettingsSingleConversation,
        )->withTextFormat(TextFormat::Plain);
    }
}
