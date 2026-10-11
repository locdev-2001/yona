<?php

namespace App\Models\Channel;

use App\Casts\EncryptedSecretsArray;
use App\Channels\AddressesContacts;
use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelConnection;
use App\Channels\ChannelPlatform;
use App\Channels\ChecksContactAddress;
use App\Channels\ConnectionMethod;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresConnection;
use App\Channels\DeclaresPlatform;
use App\Channels\LinksMessagesToSource;
use App\Channels\MatchesContactAddressCaseInsensitively;
use App\Channels\TextFormat;
use App\Channels\UndeliverableContactAddress;
use App\Models\Channel\Concerns\Channelable;
use App\Models\Concerns\Reauthorizable;
use App\Models\Contact;
use App\Models\Message;
use App\Services\Email\EmailProviderPresets;
use App\Services\Email\MailServerException;
use App\Services\Email\OAuth\EmailOAuthProviders;
use App\Services\Email\Push\MailboxPushSubscriptions;
use App\Services\Email\Verification\EmailAddressVerifier;
use App\Services\Imap\EmailSyncBackoff;
use Database\Factories\Channel\EmailFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Email extends Model implements AddressesContacts, ChecksContactAddress, DeclaresCapabilities, DeclaresConnection, DeclaresPlatform, LinksMessagesToSource, MatchesContactAddressCaseInsensitively
{
    /** @use HasFactory<EmailFactory> */
    use Channelable, HasFactory, Reauthorizable {
        Reauthorizable::reauthorized as clearReauthorizationFlags;
        Reauthorizable::reauthorizationRequired as authorizationFlagRequired;
        Reauthorizable::promptReauthorization as markReauthorizationRequired;
    }

    public const AUTHORIZATION_ERROR_THRESHOLD = 10;

    private const GMAIL_WEB_URL = 'https://mail.google.com/mail/';

    // Mã lý do trong danh sách hộp thư nhắn được khi email liên hệ không nhận thư.
    private const UNDELIVERABLE_REASON = 'email_undeliverable';

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
            'imap_sync_state' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // before_validation :ensure_forward_to_email, on: :create
        static::creating(function (Email $channel) {
            $channel->forward_to_email ??= bin2hex(random_bytes(16)).'@'.$channel->account->inboundEmailDomain();
        });

        static::deleting(fn (Email $channel) => app(MailboxPushSubscriptions::class)->stop($channel));
    }

    public function name(): string
    {
        return 'Email';
    }

    /** Một model, ba nhà cung cấp: logo theo hộp thư thật (Gmail/Outlook) chứ không theo loại kênh. */
    public function platform(): ChannelPlatform
    {
        return match (true) {
            $this->isMicrosoft() => self::outlookPlatform(),
            $this->isGoogle() || $this->isLegacyGoogle() => self::gmailPlatform(),
            default => self::emailPlatform(),
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

        if ($exception->isAuthentication()) {
            $this->promptReauthorization();
        } else {
            $this->syncBackoff()->failed();
        }
    }

    public function reauthorizationRequired(): bool
    {
        $failure = Cache::get($this->connectionFailureKey());

        // Cờ do lỗi mạng của bản cũ không được ngăn lượt quét tự phục hồi.
        return $this->authorizationFlagRequired()
            && (! is_array($failure) || ($failure['reason'] ?? null) !== MailServerException::CONNECTION);
    }

    public function syncBackoff(): EmailSyncBackoff
    {
        return new EmailSyncBackoff((int) $this->getKey());
    }

    public function promptReauthorization(): void
    {
        $failure = Cache::get($this->connectionFailureKey());

        if (is_array($failure) && ($failure['reason'] ?? null) === MailServerException::CONNECTION) {
            Cache::forget($this->connectionFailureKey());
        }

        $this->markReauthorizationRequired();
    }

    /** Lời nhắn cho người dùng về lần hỏng gần nhất, chỉ khi hộp thư đang bị đánh dấu lỗi. */
    public function connectionError(): ?string
    {
        $failure = Cache::get($this->connectionFailureKey());

        if (! is_array($failure)) {
            return null;
        }

        return ($failure['reason'] ?? null) === MailServerException::CONNECTION
            ? __('inbox_mgmt.CONNECTION_CHECK.SYNC_INTERRUPTED')
            : ($this->reauthorizationRequired() ? MailServerException::messageFor($failure) : null);
    }

    public function reauthorized(): void
    {
        $this->clearReauthorizationFlags();
        Cache::forget($this->connectionFailureKey());
        $this->syncBackoff()->recovered();
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
     * Một lối vào "Email", bên trong chọn nhà cung cấp. Mở kết nối mới chỉ bằng đăng nhập
     * Google; Outlook và máy chủ thư tự cấu hình đang sắp ra mắt. Hộp thư đã nối bằng mật
     * khẩu ứng dụng hay IMAP vẫn chạy và sửa được như cũ.
     */
    public static function connection(): ChannelConnection
    {
        // Thẻ chọn kênh mang logo Gmail: hiện chỉ Đăng nhập Google là lối vào đang mở.
        return ChannelConnection::of('email', ConnectionMethod::Form)
            ->withPlatform(self::gmailPlatform())
            ->ordered(30)
            ->withOptions(
                self::oauthOption('google')->withPlatform(self::gmailPlatform()),
                self::oauthOption('microsoft')->withPlatform(self::outlookPlatform())->comingSoon(),
                ChannelConnection::of('outlook', ConnectionMethod::Form)
                    ->withPlatform(self::outlookPlatform())
                    ->withPreset(EmailProviderPresets::for('outlook'))
                    ->withGuideUrl(EmailProviderPresets::MICROSOFT_APP_PASSWORD_URL)
                    ->comingSoon(),
                ChannelConnection::of('other', ConnectionMethod::Form)->withPlatform(self::emailPlatform())->comingSoon(),
            );
    }

    private static function gmailPlatform(): ChannelPlatform
    {
        return ChannelPlatform::of('gmail', 'Gmail');
    }

    private static function outlookPlatform(): ChannelPlatform
    {
        return ChannelPlatform::of('outlook', 'Outlook');
    }

    private static function emailPlatform(): ChannelPlatform
    {
        return ChannelPlatform::of('email', 'Email');
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

    /** Cùng địa chỉ mà thư đến của liên hệ dùng làm source_id, nên thư gửi đi và thư trả lời về chung một hộp. */
    public function contactSourceId(Contact $contact): ?string
    {
        return filled($contact->email) ? (string) $contact->email : null;
    }

    /** Địa chỉ sai cú pháp hay tên miền không nhận thư thì không mở hội thoại, thư sẽ không bao giờ tới. */
    public function assertDeliverable(string $sourceId): void
    {
        $verification = app(EmailAddressVerifier::class)->verify($sourceId);

        if (! $verification->deliverable()) {
            throw new UndeliverableContactAddress((string) $verification->message(), self::UNDELIVERABLE_REASON);
        }
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
            Capability::ConversationOutboundStart,
            Capability::SessionReauth,
            Capability::SettingsSenderName,
        )->withTextFormat(TextFormat::Html);

        // Hộp thư đăng nhập qua OAuth do nhà cung cấp giữ máy chủ thư; còn lại khách tự cấu hình.
        return $this->usesOAuth()
            ? $shared->merge(CapabilitySet::of(Capability::SessionOauth))
            : $shared->merge(CapabilitySet::of(Capability::SessionToken, Capability::SettingsMailServer));
    }
}
