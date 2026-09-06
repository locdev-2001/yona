<?php

namespace App\Models\Channel;

use App\Models\Channel\Concerns\Channelable;
use App\Models\Channel\Concerns\Reauthorizable;
use Database\Factories\Channel\EmailFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/email.rb (+ Channelable, Reauthorizable).
class Email extends Model
{
    /** @use HasFactory<EmailFactory> */
    use Channelable, HasFactory, Reauthorizable;

    public const AUTHORIZATION_ERROR_THRESHOLD = 10;

    protected $table = 'channel_email';

    /** @var list<string> EDITABLE_ATTRS — khối `channel` của inbox chỉ sửa được các cột này. */
    public const EDITABLE_ATTRS = [
        'email',
        'imap_enabled', 'imap_login', 'imap_password', 'imap_address', 'imap_port',
        'imap_enable_ssl', 'imap_authentication',
        'smtp_enabled', 'smtp_login', 'smtp_password', 'smtp_address', 'smtp_port',
        'smtp_domain', 'smtp_enable_starttls_auto', 'smtp_enable_ssl_tls',
        'smtp_openssl_verify_mode', 'smtp_authentication',
        'provider', 'verified_for_sending',
    ];

    protected $fillable = [
        'account_id',
        'email',
        'forward_to_email',
        'provider',
        'provider_config',
        ...self::EDITABLE_ATTRS,
    ];

    // Postgres default không tới model mới tạo — nhắc lại để phản hồi POST khớp
    // ActiveRecord (cùng lối đã dùng cho Channel\WebWidget).
    protected $attributes = [
        'imap_enabled' => false,
        'imap_address' => '',
        'imap_port' => 0,
        'imap_login' => '',
        'imap_enable_ssl' => true,
        'imap_authentication' => 'plain',
        'smtp_enabled' => false,
        'smtp_address' => '',
        'smtp_port' => 0,
        'smtp_login' => '',
        'smtp_domain' => '',
        'smtp_enable_starttls_auto' => true,
        'smtp_authentication' => 'login',
        'smtp_openssl_verify_mode' => 'none',
        'smtp_enable_ssl_tls' => false,
        'verified_for_sending' => false,
    ];

    protected function casts(): array
    {
        return [
            'imap_enabled' => 'boolean',
            'imap_enable_ssl' => 'boolean',
            'imap_port' => 'integer',
            'imap_password' => 'encrypted',
            'smtp_enabled' => 'boolean',
            'smtp_port' => 'integer',
            'smtp_password' => 'encrypted',
            'smtp_enable_starttls_auto' => 'boolean',
            'smtp_enable_ssl_tls' => 'boolean',
            'verified_for_sending' => 'boolean',
            'provider_config' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // before_validation :ensure_forward_to_email, on: :create
        static::creating(function (Email $channel) {
            $channel->forward_to_email ??= bin2hex(random_bytes(16)).'@'.$channel->account->inboundEmailDomain();
        });
    }

    public function name(): string
    {
        return 'Email';
    }

    public static function channelRules(): array
    {
        return ['email' => ['required', 'email', 'max:255']];
    }

    public function isMicrosoft(): bool
    {
        return $this->provider === 'microsoft';
    }

    public function isGoogle(): bool
    {
        return $this->provider === 'google';
    }

    public function isLegacyGoogle(): bool
    {
        return $this->imap_enabled && $this->imap_address === 'imap.gmail.com';
    }
}
