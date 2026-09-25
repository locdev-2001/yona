<?php

namespace App\Models\Channel;

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\ChannelPlatform;
use App\Channels\DeclaresCapabilities;
use App\Channels\DeclaresPlatform;
use App\Channels\TextFormat;
use App\Models\Channel\Concerns\Channelable;
use App\Support\FlagBitmask;
use App\Support\WidgetEmbedScript;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterval;
use Database\Factories\Channel\WebWidgetFactory;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WebWidget extends Model implements DeclaresCapabilities, DeclaresPlatform
{
    /** @use HasFactory<WebWidgetFactory> */
    use Channelable, HasFactory;

    protected $table = 'channel_web_widgets';

    /** @var list<string> EDITABLE_ATTRS — thuộc tính kênh cho sửa qua inbox update. */
    public const EDITABLE_ATTRS = [
        'website_url',
        'widget_color',
        'welcome_title',
        'welcome_tagline',
        'reply_time',
        'pre_chat_form_enabled',
        'pre_chat_form_options',
        'continuity_via_email',
        'hmac_mandatory',
        'allowed_domains',
        'selected_feature_flags',
    ];

    /** @var array<int, string> has_flags 1 => :attachments … 5 => :allow_mobile_webview */
    private const FEATURE_FLAGS = [
        1 => 'attachments',
        2 => 'emoji_picker',
        3 => 'end_conversation',
        4 => 'use_inbox_avatar_for_bot',
        5 => 'allow_mobile_webview',
    ];

    private const DEFAULT_PRE_CHAT_FORM_OPTIONS = [
        'pre_chat_message' => 'Share your queries or comments here.',
        'pre_chat_fields' => [
            ['field_type' => 'standard', 'label' => 'Email Id', 'name' => 'emailAddress', 'type' => 'email', 'required' => true, 'enabled' => false],
            ['field_type' => 'standard', 'label' => 'Full name', 'name' => 'fullName', 'type' => 'text', 'required' => false, 'enabled' => false],
            ['field_type' => 'standard', 'label' => 'Phone number', 'name' => 'phoneNumber', 'type' => 'text', 'required' => false, 'enabled' => false],
        ],
    ];

    protected $fillable = [
        'account_id',
        ...self::EDITABLE_ATTRS,
    ];

    // Mặc định của cột trong DB, nhắc lại ở model vì Eloquent không đọc default
    // của Postgres: bản ghi vừa create phải trả về đúng giá trị như ActiveRecord.
    protected $attributes = [
        'widget_color' => '#1f93ff',
        'feature_flags' => 7,
        'reply_time' => 0,
        'pre_chat_form_enabled' => false,
        'hmac_mandatory' => false,
        'continuity_via_email' => true,
        'allowed_domains' => '',
    ];

    protected function casts(): array
    {
        return [
            'feature_flags' => 'integer',
            'pre_chat_form_enabled' => 'boolean',
            'pre_chat_form_options' => 'array',
            'hmac_mandatory' => 'boolean',
            'continuity_via_email' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (WebWidget $channel) {
            $channel->website_token ??= self::generateToken();
            $channel->hmac_token ??= self::generateToken();
        });

        // before_validation :validate_pre_chat_options — chạy cả lúc tạo lẫn sửa.
        static::saving(function (WebWidget $channel) {
            if (blank($channel->pre_chat_form_options['pre_chat_fields'] ?? null)) {
                $channel->pre_chat_form_options = self::DEFAULT_PRE_CHAT_FORM_OPTIONS;
            }
        });
    }

    public function name(): string
    {
        return 'Website';
    }

    public function platform(): ChannelPlatform
    {
        return ChannelPlatform::of('website', 'Website');
    }

    // FlagShihTzu sinh sẵn `attachments?`, `end_conversation?`… cho mỗi cờ.
    public function featureEnabled(string $flag): bool
    {
        return in_array($flag, $this->selected_feature_flags, true);
    }

    public static function channelRules(): array
    {
        return [
            // Không còn trên form tạo: không nơi nào đọc cột này, giới hạn trang được nhúng nằm ở allowed_domains.
            'website_url' => ['sometimes', 'nullable', 'string', 'max:255'],
            'widget_color' => ['sometimes', 'filled', 'string', 'max:255'],
            'welcome_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'welcome_tagline' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    // FlagShihTzu sinh cặp selected_<cột>/selected_<cột>= cho feature_flags; đây
    // là cửa duy nhất đọc/ghi bitmask đó.
    protected function selectedFeatureFlags(): Attribute
    {
        $bitmask = new FlagBitmask(self::FEATURE_FLAGS);

        return Attribute::make(
            get: fn (): array => $bitmask->toNames((int) ($this->attributes['feature_flags'] ?? 0)),
            set: fn (?iterable $names): array => ['feature_flags' => $bitmask->toBitmask($names)],
        );
    }

    protected function replyTime(): Attribute
    {
        return Attribute::make(
            get: fn (int $value): string => ReplyTime::from($value)->key(),
            set: fn (ReplyTime|int|string $value): int => ReplyTime::coerce($value)->value,
        );
    }

    /**
     * Header Content-Security-Policy giới hạn trang nào được nhúng widget, dựng từ
     * "Tên miền được phép". null = không giới hạn: chưa khai tên miền (giữ widget
     * khách đã nhúng), hoặc đã bật cờ WebView và request đến từ app di động — WebView
     * nạp trang từ file:// hay origin "null", không khớp được tên miền nào.
     */
    public function frameAncestorsPolicy(?string $requestOrigin): ?string
    {
        if (blank($this->allowed_domains)) {
            return null;
        }

        if ($this->featureEnabled('allow_mobile_webview') && self::isNonWebOrigin($requestOrigin)) {
            return null;
        }

        $sources = collect(preg_split('/[\s,]+/', (string) $this->allowed_domains))
            ->map(fn (string $domain): ?string => self::frameAncestorSource($domain))
            ->filter()
            ->unique();

        return implode(' ', ['frame-ancestors', "'self'", ...$sources]);
    }

    private static function isNonWebOrigin(?string $origin): bool
    {
        return blank($origin) || $origin === 'null' || str_starts_with($origin, 'file://');
    }

    /**
     * Một tên miền người dùng nhập → nguồn hợp lệ của frame-ancestors. Bỏ đường dẫn
     * thừa, giữ scheme http(s) và cổng, hỗ trợ `*.domain`. Giá trị không phải tên
     * miền bị bỏ qua để không chèn được chỉ thị CSP khác vào header.
     */
    private static function frameAncestorSource(string $domain): ?string
    {
        if (preg_match('~^(?:(https?)://)?([^/?#]+)~', strtolower(trim($domain)), $parts) !== 1) {
            return null;
        }

        [, $scheme, $hostWithPort] = $parts;
        $hostWithPort = self::toAsciiHost($hostWithPort);

        if (preg_match('/^(\*|(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*(:(\d{1,5}|\*))?)$/', $hostWithPort) !== 1) {
            return null;
        }

        return $scheme === '' ? $hostWithPort : "{$scheme}://{$hostWithPort}";
    }

    // Tên miền tiếng Việt có dấu phải ở dạng punycode mới khớp được trong CSP.
    private static function toAsciiHost(string $hostWithPort): string
    {
        if (preg_match('/^[\x20-\x7e]*$/', $hostWithPort) === 1 || ! function_exists('idn_to_ascii')) {
            return $hostWithPort;
        }

        [$host, $port] = array_pad(explode(':', $hostWithPort, 2), 2, null);
        $asciiHost = idn_to_ascii($host, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46);

        return $asciiHost === false ? $hostWithPort : $asciiHost.($port === null ? '' : ":{$port}");
    }

    // web_widget_script — BASE_URL lấy từ config('app.url') thay cho ENV FRONTEND_URL.
    protected function webWidgetScript(): Attribute
    {
        return Attribute::get(fn (): string => WidgetEmbedScript::render((string) config('app.url'), (string) $this->website_token));
    }

    /**
     * Hạn khách tự thu hồi tin của mình. Mỗi nền tảng tự đặt hạn thu hồi riêng
     * nên con số là chính sách của kênh, nằm cạnh bộ năng lực của kênh.
     */
    private const RECALL_WINDOW_SECONDS = 300;

    public function recallWindow(): CarbonInterval
    {
        return CarbonInterval::seconds(self::RECALL_WINDOW_SECONDS);
    }

    public function withinRecallWindow(DateTimeInterface $sentAt): bool
    {
        return CarbonImmutable::instance($sentAt)->add($this->recallWindow())->isFuture();
    }

    /** Widget web: danh tính là token khách, hồ sơ đến từ form trước chat. */
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
            Capability::InboundCaption,
            Capability::OutboundText,
            Capability::OutboundImage,
            Capability::OutboundVideo,
            Capability::OutboundAudio,
            Capability::OutboundFile,
            Capability::OutboundReplyTo,
            Capability::OutboundRecall,
            Capability::OutboundTyping,
            Capability::EventDelivered,
            Capability::EventSeen,
            Capability::EventRecall,
            Capability::EventTyping,
            Capability::ProfilePhone,
            Capability::ProfileEmail,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
        )->withTextFormat(TextFormat::Markdown);
    }
}
