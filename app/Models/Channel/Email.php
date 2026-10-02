<?php

namespace App\Models\Channel;

use App\Casts\EncryptedSecretsArray;
use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelConnection;
use App\Channels\ChannelPlatform;
use App\Channels\ConnectionMethod;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresConnection;
use App\Channels\DeclaresPlatform;
use App\Channels\LinksMessagesToSource;
use App\Channels\TextFormat;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Concerns\Reauthorizable;
use App\Models\Message;
use App\Services\Email\EmailProviderPresets;
use App\Services\Email\MailServerException;
use App\Services\Email\OAuth\EmailOAuthProviders;
use Database\Factories\Channel\EmailFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Email extends Model implements DeclaresCapabilities, DeclaresConnection, DeclaresPlatform, LinksMessagesToSource
{
    /** @use HasFactory<EmailFactory> */
    use Channelable, HasFactory, Reauthorizable {
        Reauthorizable::reauthorized as clearReauthorizationFlags;
    }

    public const AUTHORIZATION_ERROR_THRESHOLD = 10;

    private const GMAIL_WEB_URL = 'https://mail.google.com/mail/';

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
            // Token OAuth (access/refresh) mã hoá ngay trong cột jsonb.
            'provider_config' => EncryptedSecretsArray::class.':access_token,refresh_token',
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

    /** Một model, ba nhà cung cấp: logo theo hộp thư thật (Gmail/Outlook) chứ không theo loại kênh. */
    public function platform(): ChannelPlatform
    {
        return match (true) {
            $this->isMicrosoft() => ChannelPlatform::of('outlook', 'Outlook'),
            $this->isGoogle() || $this->isLegacyGoogle() => ChannelPlatform::of('gmail', 'Gmail'),
            default => ChannelPlatform::of('email', 'Email'),
        };
    }

    public static function channelRules(): array
    {
        // Form "Thêm kênh" (Gmail/Outlook/Khác) gửi luôn máy chủ thư lúc tạo.
        return [
            'email' => ['required', 'email', 'max:255'],
            'imap_enabled' => ['sometimes', 'boolean'],
            'imap_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'imap_port' => ['sometimes', 'nullable', 'integer', 'between:1,65535'],
            'imap_login' => ['sometimes', 'nullable', 'string', 'max:255'],
            'imap_password' => ['sometimes', 'nullable', 'string', 'max:1024'],
            'imap_enable_ssl' => ['sometimes', 'boolean'],
            'smtp_enabled' => ['sometimes', 'boolean'],
            'smtp_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smtp_port' => ['sometimes', 'nullable', 'integer', 'between:1,65535'],
            'smtp_login' => ['sometimes', 'nullable', 'string', 'max:255'],
            'smtp_password' => ['sometimes', 'nullable', 'string', 'max:1024'],
            'smtp_enable_starttls_auto' => ['sometimes', 'boolean'],
            'smtp_enable_ssl_tls' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Máy chủ thư từ chối: sai mật khẩu thì đòi kết nối lại ngay (tự hết không được),
     * không tới được máy chủ thì đếm tới ngưỡng rồi mới đòi (mạng chập chờn).
     */
    public function recordConnectionFailure(MailServerException $exception): void
    {
        Cache::forever($this->connectionFailureKey(), $exception->toArray());

        $exception->isAuthentication() ? $this->promptReauthorization() : $this->authorizationError();
    }

    /** Lời nhắn cho người dùng về lần hỏng gần nhất, chỉ khi hộp thư đang bị đánh dấu lỗi. */
    public function connectionError(): ?string
    {
        if (! $this->reauthorizationRequired()) {
            return null;
        }

        $failure = Cache::get($this->connectionFailureKey());

        return is_array($failure) ? MailServerException::messageFor($failure) : null;
    }

    public function reauthorized(): void
    {
        $this->clearReauthorizationFlags();
        Cache::forget($this->connectionFailureKey());
    }

    private function connectionFailureKey(): string
    {
        return 'EMAIL_CONNECTION_FAILURE::'.$this->getKey();
    }

    // Form Gmail/Outlook không hỏi tên: hộp thư mang luôn địa chỉ thư (ChannelSetupService).
    public static function namesInboxItself(): bool
    {
        return true;
    }

    // Gmail tìm đúng thư theo Message-ID; authuser chọn đúng tài khoản khi trình duyệt đăng nhập nhiều Gmail.
    public function sourceMessageUrl(Message $message): ?string
    {
        if (! ($this->isGoogle() || $this->isLegacyGoogle()) || blank($message->source_id)) {
            return null;
        }

        return self::GMAIL_WEB_URL.'?'.http_build_query(['authuser' => $this->email])
            .'#search/'.rawurlencode('rfc822msgid:'.$message->source_id);
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

    /**
     * Một lối vào "Email", bên trong chọn nhà cung cấp: Gmail/Outlook tự điền máy chủ thư,
     * khách chỉ nhập địa chỉ + App Password; "Khác" điền đủ thông số.
     */
    public static function connection(): ChannelConnection
    {
        return ChannelConnection::of('email', ConnectionMethod::Form)
            ->ordered(30)
            ->withOptions(
                self::oauthOption('google'),
                self::oauthOption('microsoft'),
                ChannelConnection::of('gmail', ConnectionMethod::Form)
                    ->withPreset(EmailProviderPresets::for('gmail'))
                    ->withGuideUrl(EmailProviderPresets::GMAIL_APP_PASSWORD_URL),
                ChannelConnection::of('outlook', ConnectionMethod::Form)
                    ->withPreset(EmailProviderPresets::for('outlook'))
                    ->withGuideUrl(EmailProviderPresets::MICROSOFT_APP_PASSWORD_URL),
                ChannelConnection::of('other', ConnectionMethod::Form),
            );
    }

    // Đăng nhập nhà cung cấp (OAuth): đóng khi thiếu app hoặc cờ khoá (Gmail chờ Google duyệt).
    private static function oauthOption(string $provider): ChannelConnection
    {
        return ChannelConnection::of($provider, ConnectionMethod::OauthRedirect)
            ->available(EmailOAuthProviders::find($provider)?->available() ?? false)
            ->startsAt('email_oauth.start', ['provider' => $provider]);
    }

    public function usesOAuth(): bool
    {
        return $this->isGoogle() || $this->isMicrosoft();
    }

    /** Thư đến qua IMAP/mailbox: thân HTML thành markdown, tệp đính kèm giữ nguyên tên. */
    public function capabilities(): CapabilitySet
    {
        $shared = CapabilitySet::of(
            Capability::InboundText,
            Capability::InboundRichText,
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
            Capability::ProfileName,
            Capability::ProfileEmail,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SessionReauth,
            Capability::SettingsSenderName,
        )->withTextFormat(TextFormat::Html);

        // Hộp thư đăng nhập qua OAuth do nhà cung cấp giữ máy chủ thư; còn lại khách tự cấu hình.
        return $this->usesOAuth()
            ? $shared->merge(CapabilitySet::of(Capability::SessionOauth))
            : $shared->merge(CapabilitySet::of(Capability::SessionToken, Capability::SettingsMailServer));
    }
}
