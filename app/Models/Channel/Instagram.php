<?php

namespace App\Models\Channel;

use App\Builders\ContactInboxWithContactBuilder;
use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelPlatform;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresPlatform;
use App\Channels\TextFormat;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Concerns\Reauthorizable;
use App\Models\ContactInbox;
use Database\Factories\Channel\InstagramFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/instagram.rb (Instagram login trực tiếp).
class Instagram extends Model implements DeclaresCapabilities, DeclaresPlatform
{
    /** @use HasFactory<InstagramFactory> */
    use Channelable, HasFactory, Reauthorizable;

    public const AUTHORIZATION_ERROR_THRESHOLD = 1;

    protected $table = 'channel_instagram';

    protected $fillable = ['account_id', 'instagram_id', 'access_token', 'expires_at'];

    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'expires_at' => 'datetime',
        ];
    }

    public function name(): string
    {
        return 'Instagram';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('instagram', 'Instagram');
    }

    public static function channelRules(): array
    {
        return [
            'instagram_id' => ['required', 'string', 'max:255'],
            'access_token' => ['required', 'string'],
            'expires_at' => ['required', 'date'],
        ];
    }

    public static function apiVersion(): string
    {
        return (string) config('services.instagram.api_version', 'v22.0');
    }

    public function baseUri(): string
    {
        return 'https://graph.instagram.com/'.self::apiVersion();
    }

    public function createContactInbox(string $sourceId, ?string $name): ?ContactInbox
    {
        return (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: ['name' => $name],
            sourceId: $sourceId,
        ))->perform();
    }

    /** Instagram DM: có xử lý khách thu hồi tin (message_unsend) nên khai event_recall. */
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
            Capability::EventRecall,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionOauth,
            Capability::SessionReauth,
        )->withTextFormat(TextFormat::Plain);
    }
}
