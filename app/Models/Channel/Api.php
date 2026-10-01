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
use App\Channels\TextFormat;
use App\Models\Channel\Concerns\Channelable;
use Database\Factories\Channel\ApiFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Api extends Model implements DeclaresCapabilities, DeclaresConnection, DeclaresPlatform
{
    /** @use HasFactory<ApiFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_api';

    /** @var list<string> Kênh chỉ cho sửa các thuộc tính này qua inbox update (EDITABLE_ATTRS). */
    public const EDITABLE_ATTRS = ['webhook_url', 'hmac_mandatory', 'additional_attributes'];

    protected $fillable = [
        'account_id',
        'webhook_url',
        'hmac_mandatory',
        'additional_attributes',
    ];

    protected function casts(): array
    {
        return [
            'hmac_mandatory' => 'boolean',
            'additional_attributes' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Api $channel) {
            $channel->identifier ??= self::generateToken();
            $channel->hmac_token ??= self::generateToken();
            $channel->secret ??= self::generateToken();
        });
    }

    public function name(): string
    {
        return 'API';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('api', 'API');
    }

    public static function channelRules(): array
    {
        return ['webhook_url' => ['sometimes', 'nullable', 'string', 'max:2048']];
    }

    // WebhookSecretable#reset_secret!
    public function resetSecret(): void
    {
        $this->forceFill(['secret' => self::generateToken()])->save();
    }

    /** Kênh API: điền URL webhook, không cần app nền tảng. */
    public static function connection(): ChannelConnection
    {
        return ChannelConnection::of('api', ConnectionMethod::Form)->ordered(100);
    }

    /** Kênh API: hệ ngoài tự bơm tin vào và đọc tin ra, nội dung do bên tích hợp quyết. */
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
            // Inbox API dùng status thô sent/delivered/read của hệ ngoài làm dấu tick
            // (bản gốc: `isAPIInbox` trong MessageMeta.vue). Đường ghi status
            // (messages#update) chưa port — nợ có tên ở docs/channel-capabilities.md §4.1.
            Capability::EventDelivered,
            Capability::EventSeen,
            Capability::ProfileName,
            Capability::ProfileAvatar,
            Capability::ProfilePhone,
            Capability::ProfileEmail,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SettingsSingleConversation,
            Capability::SettingsWebhook,
            Capability::SettingsClientApi,
        )->withTextFormat(TextFormat::Markdown);
    }
}
