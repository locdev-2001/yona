<?php

namespace App\Models\Channel;

use App\Channels\AddressesContacts;
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
use App\Models\Contact;
use App\Support\FlagBitmask;
use App\Support\Widget\WidgetSettings;
use App\Support\WidgetEmbedScript;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterval;
use Database\Factories\Channel\WebWidgetFactory;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class WebWidget extends Model implements AddressesContacts, DeclaresCapabilities, DeclaresConnection, DeclaresPlatform
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
        'widget_settings',
    ];

    /** @var array<int, string> has_flags 1 => :attachments … 5 => :allow_mobile_webview */
    private const FEATURE_FLAGS = [
        1 => 'attachments',
        2 => 'emoji_picker',
        3 => 'end_conversation',
        4 => 'use_inbox_avatar_for_bot',
        5 => 'allow_mobile_webview',
    ];

    /** @var array<string, array{0: string, 1: string, 2: bool}> name => [khóa chuỗi ở lang/widget.php, type, required] */
    private const STANDARD_PRE_CHAT_FIELDS = [
        'emailAddress' => ['EMAIL_ADDRESS', 'email', true],
        'fullName' => ['FULL_NAME', 'text', false],
        'phoneNumber' => ['PHONE_NUMBER', 'text', false],
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
            'widget_settings' => 'array',
        ];
    }

    /** Cấu hình widget mới đã trộn mặc định (App\Support\Widget\WidgetSettings). */
    public function widgetSettings(): array
    {
        return WidgetSettings::resolve($this->widget_settings);
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
                $channel->pre_chat_form_options = self::defaultPreChatFormOptions($channel->account?->locale);
            }
        });
    }

    public function name(): string
    {
        return 'Website';
    }

    /**
     * Biểu mẫu trước chat của hộp thư mới: ba trường chuẩn (đều tắt) và lời nhắn.
     * Widget in thẳng chữ đã lưu cho khách và hiện theo ngôn ngữ của account, nên
     * chữ mặc định lấy từ lang/ theo ngôn ngữ account, không theo người đang thao tác.
     *
     * @return array{pre_chat_message: string, pre_chat_fields: list<array<string, mixed>>}
     */
    public static function defaultPreChatFormOptions(?string $accountLocale): array
    {
        $locale = $accountLocale ?? config('app.locale');

        $fields = collect(self::STANDARD_PRE_CHAT_FIELDS)
            ->map(fn (array $field, string $name): array => [
                'field_type' => 'standard',
                'label' => __("widget.PRE_CHAT_FORM.FIELDS.{$field[0]}.LABEL", [], $locale),
                'placeholder' => __("widget.PRE_CHAT_FORM.FIELDS.{$field[0]}.PLACEHOLDER", [], $locale),
                'name' => $name,
                'type' => $field[1],
                'required' => $field[2],
                'enabled' => false,
            ])
            ->values()
            ->all();

        return [
            'pre_chat_message' => __('inbox_mgmt.PRE_CHAT_FORM.PRE_CHAT_MESSAGE.DEFAULT', [], $locale),
            'pre_chat_fields' => $fields,
        ];
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

    public static function connection(): ChannelConnection
    {
        return ChannelConnection::of('website', ConnectionMethod::Form)->ordered(20);
    }

    /**
     * Client API dựng phiên khách widget bằng một mã ngẫu nhiên. Không khai mở hội thoại
     * chủ động: khách chỉ thấy tin trong phiên trình duyệt của chính họ.
     */
    public function contactSourceId(Contact $contact): string
    {
        return (string) Str::uuid();
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
            Capability::OutboundReaction,
            Capability::OutboundQuickReply,
            Capability::OutboundButtons,
            Capability::OutboundCard,
            Capability::EventDelivered,
            Capability::EventSeen,
            Capability::EventRecall,
            Capability::EventReaction,
            Capability::EventTyping,
            Capability::ProfilePhone,
            Capability::ProfileEmail,
            Capability::IdentityStableId,
            Capability::ThreadingContinuous,
            Capability::SettingsWebWidget,
            Capability::SettingsPreChatForm,
        )->withTextFormat(TextFormat::Markdown);
    }
}
