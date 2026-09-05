<?php

namespace App\Models\Channel;

use App\Models\Channel\Concerns\Channelable;
use App\Support\FlagBitmask;
use Database\Factories\Channel\WebWidgetFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/channel/web_widget.rb (+ Channelable, FlagShihTzu).
class WebWidget extends Model
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

    // FlagShihTzu sinh sẵn `attachments?`, `end_conversation?`… cho mỗi cờ.
    public function featureEnabled(string $flag): bool
    {
        return in_array($flag, $this->selected_feature_flags, true);
    }

    public static function channelRules(): array
    {
        return [
            'website_url' => ['required', 'string', 'max:255'],
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

    // web_widget_script — giữ nguyên từng dòng/thụt lề của bản gốc; BASE_URL lấy
    // từ config('app.url') thay cho ENV FRONTEND_URL.
    protected function webWidgetScript(): Attribute
    {
        return Attribute::get(function (): string {
            $baseUrl = (string) config('app.url');

            return implode("\n", [
                '',
                '    <script>',
                '      (function(d,t) {',
                '        var BASE_URL="'.$baseUrl.'";',
                '        var g=d.createElement(t),s=d.getElementsByTagName(t)[0];',
                '        g.src=BASE_URL+"/packs/js/sdk.js";',
                '        g.async = true;',
                '        s.parentNode.insertBefore(g,s);',
                '        g.onload=function(){',
                '          window.chatwootSDK.run({',
                "            websiteToken: '{$this->website_token}',",
                '            baseUrl: BASE_URL',
                '          })',
                '        }',
                '      })(document,"script");',
                '    </script>',
                '    ',
            ]);
        });
    }
}
