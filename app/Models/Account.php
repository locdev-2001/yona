<?php

namespace App\Models;

use App\Models\Concerns\Reportable;
use Database\Factories\AccountFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Account extends Model
{
    /** @use HasFactory<AccountFactory> */
    use HasFactory, Reportable;

    public const STATUS_ACTIVE = 0;

    public const STATUS_SUSPENDED = 1;

    // Account#active? — tài khoản bị treo thì ngưng nhận sự kiện từ kênh ngoài.
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public const ONBOARDING_STEP_KEY = 'onboarding_step';

    protected $fillable = [
        'name',
        'locale',
        'domain',
        'support_email',
        'auto_resolve_duration',
        'custom_attributes',
        'settings',
        'status',
    ];

    protected $attributes = [
        'status' => self::STATUS_ACTIVE,
    ];

    protected function casts(): array
    {
        return [
            'feature_flags' => 'array',
            'limits' => 'array',
            'custom_attributes' => 'array',
            'internal_attributes' => 'array',
            'settings' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // Ngôn ngữ mặc định của account phải là APP_LOCALE. Trước đây giá trị 'en'
        // nằm cứng ở $attributes và ở default của cột, còn AccountBuilder lại gán
        // config('app.locale') — account tạo ngoài builder (seeder, admin, import)
        // ra một ngôn ngữ, tạo trong builder ra ngôn ngữ khác.
        static::creating(function (Account $account) {
            $account->locale ??= config('app.locale');
        });

        // has_many :inboxes, dependent: :destroy_async — phải xóa qua model, vì
        // FK `inboxes.account_id ON DELETE CASCADE` không kích hoạt hook của Inbox
        // và sẽ bỏ lại hàng channel_* mồ côi. Bot cũng vậy: FK cascade bỏ lại
        // access token của bot.
        static::deleting(function (Account $account) {
            $account->inboxes()->cursor()->each(fn (Inbox $inbox) => $inbox->delete());
            $account->agentBots()->cursor()->each(fn (AgentBot $agentBot) => $agentBot->delete());
        });

        static::deleted(function (Account $account) {
            DB::statement("DROP SEQUENCE IF EXISTS camp_dpid_seq_{$account->id}");
            DB::statement("DROP SEQUENCE IF EXISTS conv_dpid_seq_{$account->id}");
        });
    }

    /**
     * `store_accessor :settings, :auto_resolve_after, …` của bản gốc — cột
     * `settings` (jsonb) là nơi duy nhất giữ cấu hình mềm của account.
     */
    public const SETTINGS_ATTRS = [
        'auto_resolve_after',
        'auto_resolve_message',
        'auto_resolve_ignore_waiting',
        'auto_resolve_label',
        'audio_transcriptions',
        'keep_pending_on_bot_failure',
        'reporting_timezone',
    ];

    // store_accessor :settings, :reporting_timezone — múi giờ dùng để gộp
    // reporting_events thành dòng rollup theo ngày.
    public function reportingTimezone(): ?string
    {
        $timezone = $this->setting('reporting_timezone');

        return blank($timezone) ? null : (string) $timezone;
    }

    public function setting(string $key): mixed
    {
        return $this->settings[$key] ?? null;
    }

    // scope :with_auto_resolve — account đã đặt thời hạn tự đóng hội thoại.
    public function scopeWithAutoResolve(Builder $query): Builder
    {
        return $query->whereRaw("(settings ->> 'auto_resolve_after')::int IS NOT NULL");
    }

    public function accountUsers(): HasMany
    {
        return $this->hasMany(AccountUser::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'account_users')
            ->withPivot(['role', 'availability', 'auto_offline', 'active_at'])
            ->withTimestamps();
    }

    public function dataImports(): HasMany
    {
        return $this->hasMany(DataImport::class);
    }

    public function inviteLinks(): HasMany
    {
        return $this->hasMany(AccountInviteLink::class);
    }

    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    public function cannedResponses(): HasMany
    {
        return $this->hasMany(CannedResponse::class);
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    public function inboxes(): HasMany
    {
        return $this->hasMany(Inbox::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function automationRules(): HasMany
    {
        return $this->hasMany(AutomationRule::class);
    }

    public function macros(): HasMany
    {
        return $this->hasMany(Macro::class);
    }

    public function customAttributeDefinitions(): HasMany
    {
        return $this->hasMany(CustomAttributeDefinition::class);
    }

    public function customFilters(): HasMany
    {
        return $this->hasMany(CustomFilter::class);
    }

    public function automationRulePendingExecutions(): HasMany
    {
        return $this->hasMany(AutomationRulePendingExecution::class);
    }

    public function webhooks(): HasMany
    {
        return $this->hasMany(Webhook::class);
    }

    public function agentBots(): HasMany
    {
        return $this->hasMany(AgentBot::class);
    }

    public function dashboardApps(): HasMany
    {
        return $this->hasMany(DashboardApp::class);
    }

    public function hooks(): HasMany
    {
        return $this->hasMany(Integrations\Hook::class);
    }

    public function agentBotInboxes(): HasMany
    {
        return $this->hasMany(AgentBotInbox::class);
    }

    public function notificationSettings(): HasMany
    {
        return $this->hasMany(NotificationSetting::class);
    }

    public function portals(): HasMany
    {
        return $this->hasMany(Portal::class);
    }

    public function mentions(): HasMany
    {
        return $this->hasMany(Mention::class);
    }

    // Featurable#feature_enabled? — override trong feature_flags (jsonb) thắng
    // default của config/features.php (quyết định #8: bỏ bitset FlagShihTzu).
    // Account#inbound_email_domain / #support_email — nguồn địa chỉ thư của
    // tài khoản: cột riêng của tenant trước, không có thì rơi về biến môi trường.
    public function inboundEmailDomain(): ?string
    {
        return $this->domain ?: config('mail.inbound_email_domain');
    }

    public function supportEmail(): ?string
    {
        return $this->support_email ?: config('mail.sender_email');
    }

    public function featureEnabled(string $name): bool
    {
        return (bool) ($this->feature_flags[$name] ?? config("features.{$name}", false));
    }

    // Featurable#enabled_features — map {tên => true} chỉ gồm feature đang bật
    // (shape của json.features trong _account.json.jbuilder).
    /** @return array<string, bool> */
    public function enabledFeatures(): array
    {
        $overrides = $this->feature_flags ?? [];

        return collect(config('features'))
            ->merge($overrides)
            ->filter(fn ($enabled) => (bool) $enabled)
            ->map(fn () => true)
            ->all();
    }

    // Account#webhook_data — khối `account` nhúng trong mọi payload webhook.
    public function webhookData(): array
    {
        return ['id' => $this->id, 'name' => $this->name];
    }

    // Account#api_and_webhooks_enabled? — CE luôn true; ở đây theo cờ tính năng.
    public function apiAndWebhooksEnabled(): bool
    {
        return $this->featureEnabled('api_and_webhooks');
    }

    public function onboardingStep(): ?string
    {
        return $this->custom_attributes[self::ONBOARDING_STEP_KEY] ?? null;
    }

    public function finishOnboarding(): void
    {
        $customAttributes = $this->custom_attributes;
        unset($customAttributes[self::ONBOARDING_STEP_KEY]);
        $this->custom_attributes = $customAttributes;
        $this->save();
    }
}
