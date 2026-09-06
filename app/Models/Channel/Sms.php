<?php

namespace App\Models\Channel;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\DeclaresCapabilities;
use App\Models\Channel\Concerns\Channelable;
use Database\Factories\Channel\SmsFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/sms.rb (nhà cung cấp Bandwidth).
// Phần gọi API nằm ở App\Services\Sms\BandwidthClient.
class Sms extends Model implements DeclaresCapabilities
{
    /** @use HasFactory<SmsFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_sms';

    /** @var list<string> */
    public const EDITABLE_ATTRS = ['phone_number', 'provider_config'];

    protected $fillable = ['account_id', 'phone_number', 'provider', 'provider_config'];

    protected $attributes = ['provider' => 'default'];

    protected function casts(): array
    {
        return ['provider_config' => 'array'];
    }

    public function name(): string
    {
        return 'Sms';
    }

    public static function channelRules(): array
    {
        return [
            'phone_number' => ['required', 'string', 'max:255'],
            'provider_config' => ['sometimes', 'array'],
        ];
    }

    public function apiBasePath(): string
    {
        return 'https://messaging.bandwidth.com/api/v2';
    }

    /** SMS qua Bandwidth: chỉ chữ, MMS chưa làm (nợ có tên). */
    public function capabilities(): CapabilitySet
    {
        return CapabilitySet::of(
            Capability::InboundText,
            Capability::OutboundText,
            Capability::EventDelivered,
            Capability::ProfilePhone,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionToken,
        );
    }
}
