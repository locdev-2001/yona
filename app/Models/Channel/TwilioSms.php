<?php

namespace App\Models\Channel;

use App\Models\Channel\Concerns\Channelable;
use Database\Factories\Channel\TwilioSmsFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/twilio_sms.rb — một model phục vụ hai
// medium (SMS và WhatsApp qua Twilio). Gem twilio-ruby thay bằng App\Services\Twilio\TwilioClient.
class TwilioSms extends Model
{
    /** @use HasFactory<TwilioSmsFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_twilio_sms';

    public const MEDIUM_SMS = 0;

    public const MEDIUM_WHATSAPP = 1;

    /** @var array<string, int> enum medium của bản gốc. */
    public const MEDIUMS = ['sms' => self::MEDIUM_SMS, 'whatsapp' => self::MEDIUM_WHATSAPP];

    /** @var list<string> */
    public const EDITABLE_ATTRS = ['account_sid', 'auth_token'];

    protected $fillable = [
        'account_id', 'account_sid', 'auth_token', 'phone_number', 'medium',
        'messaging_service_sid', 'api_key_sid', 'api_key_secret', 'provider_config',
    ];

    protected $attributes = [
        'medium' => self::MEDIUM_SMS,
        'voice_enabled' => false,
    ];

    protected function casts(): array
    {
        return [
            'medium' => 'integer',
            'auth_token' => 'encrypted',
            'provider_config' => 'array',
            'content_templates' => 'array',
            'voice_enabled' => 'boolean',
        ];
    }

    public function name(): string
    {
        return $this->isSms() ? 'Twilio SMS' : 'Whatsapp';
    }

    public static function channelRules(): array
    {
        return [
            'account_sid' => ['required', 'string', 'max:255'],
            'auth_token' => ['required', 'string'],
            'phone_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'messaging_service_sid' => ['sometimes', 'nullable', 'string', 'max:255'],
            'medium' => ['sometimes', 'in:sms,whatsapp'],
            'api_key_sid' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    // Form tạo inbox gửi medium dạng chuỗi ('sms'/'whatsapp') như bản gốc (enum
    // của Rails); cột ở đây là số nên phải quy đổi ở đúng một chỗ.
    public function setMediumAttribute(mixed $value): void
    {
        $this->attributes['medium'] = is_string($value)
            ? (self::MEDIUMS[$value] ?? self::MEDIUM_SMS)
            : $value;
    }

    public function isSms(): bool
    {
        return $this->medium === self::MEDIUM_SMS;
    }

    public function isWhatsapp(): bool
    {
        return $this->medium === self::MEDIUM_WHATSAPP;
    }

    // Channel::TwilioSms#send_message_from — messaging service được ưu tiên hơn số điện thoại.
    public function sendMessageFrom(): array
    {
        return filled($this->messaging_service_sid)
            ? ['MessagingServiceSid' => $this->messaging_service_sid]
            : ['From' => $this->phone_number];
    }
}
