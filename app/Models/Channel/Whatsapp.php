<?php

namespace App\Models\Channel;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelPlatform;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresPlatform;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Concerns\Reauthorizable;
use App\Services\Whatsapp\Providers\Whatsapp360DialogService;
use App\Services\Whatsapp\Providers\WhatsappCloudService;
use App\Services\Whatsapp\Providers\WhatsappProvider;
use Database\Factories\Channel\WhatsappFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/whatsapp.rb. Mỗi nhà cung cấp là một
// driver riêng (providerService), lõi kênh không biết chi tiết Cloud/360Dialog.
class Whatsapp extends Model implements DeclaresCapabilities, DeclaresPlatform
{
    /** @use HasFactory<WhatsappFactory> */
    use Channelable, HasFactory, Reauthorizable;

    public const AUTHORIZATION_ERROR_THRESHOLD = 10;

    /** @var list<string> */
    public const PROVIDERS = ['default', 'whatsapp_cloud'];

    /** @var array<string, class-string<WhatsappProvider>> Thêm nhà cung cấp = thêm một dòng. */
    private const PROVIDER_SERVICES = [
        'whatsapp_cloud' => WhatsappCloudService::class,
        'default' => Whatsapp360DialogService::class,
    ];

    protected $table = 'channel_whatsapp';

    /** @var list<string> */
    public const EDITABLE_ATTRS = ['phone_number', 'provider', 'provider_config'];

    protected $fillable = [
        'account_id', 'phone_number', 'provider', 'provider_config', 'business_management_token',
    ];

    protected $attributes = ['provider' => 'default'];

    protected function casts(): array
    {
        return [
            'provider_config' => 'array',
            'message_templates' => 'array',
            'phone_number_health' => 'array',
            'business_management_token' => 'encrypted',
            'message_templates_last_updated' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // before_validation :ensure_webhook_verify_token
        static::saving(function (Whatsapp $channel) {
            if ($channel->provider !== 'whatsapp_cloud') {
                return;
            }

            $config = $channel->provider_config ?? [];

            if (blank($config['webhook_verify_token'] ?? null)) {
                $config['webhook_verify_token'] = bin2hex(random_bytes(16));
                $channel->provider_config = $config;
            }
        });
    }

    public function name(): string
    {
        return 'Whatsapp';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('whatsapp', 'WhatsApp');
    }

    public static function channelRules(): array
    {
        return [
            'phone_number' => ['required', 'string', 'max:255'],
            'provider' => ['sometimes', 'in:'.implode(',', self::PROVIDERS)],
            'provider_config' => ['sometimes', 'array'],
        ];
    }

    public function providerService(): WhatsappProvider
    {
        $serviceClass = self::PROVIDER_SERVICES[$this->provider] ?? self::PROVIDER_SERVICES['default'];

        return new $serviceClass($this);
    }

    public function mediaUrl(string $mediaId): string
    {
        return $this->providerService()->mediaUrl($mediaId);
    }

    /** @return array<string, string> */
    public function apiHeaders(): array
    {
        return $this->providerService()->apiHeaders();
    }

    /** WhatsApp Cloud/360dialog: reaction đến bị bỏ qua ở IncomingMessageService (nợ có tên). */
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
            Capability::InboundCaption,
            Capability::OutboundText,
            Capability::OutboundImage,
            Capability::OutboundVideo,
            Capability::OutboundAudio,
            Capability::OutboundFile,
            Capability::EventDelivered,
            Capability::EventSeen,
            Capability::ProfileName,
            Capability::ProfilePhone,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionToken,
            Capability::SessionReauth,
        );
    }
}
