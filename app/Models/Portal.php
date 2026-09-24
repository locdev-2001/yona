<?php

namespace App\Models;

use App\Models\Channel\WebWidget;
use App\Models\Concerns\SelfValidating;
use App\Services\HelpCenter\SlugGenerator;
use Database\Factories\PortalFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

// `folders` bỏ (bảng chết trong bản gốc); logo dùng Attachment morph thay
// ActiveStorage (quyết định #9).
class Portal extends Model
{
    /** @use HasFactory<PortalFactory> */
    use HasFactory, SelfValidating;

    public const DEFAULT_COLOR = '#1f93ff';

    public const LAYOUTS = ['classic', 'documentation'];

    public const POPULAR_CATEGORY_LIMIT = 3;

    public const POPULAR_ARTICLE_LIMIT = 6;

    /** @var array<string, string> ANALYTICS_CONFIG_FORMATS — id nhà cung cấp và khuôn phải khớp. */
    public const ANALYTICS_CONFIG_FORMATS = [
        'gtm_container_id' => '/\AGTM-[A-Z0-9]+\z/',
        'ga4_measurement_id' => '/\AG-[A-Z0-9]+\z/',
        'hotjar_site_id' => '/\A\d+\z/',
        'plausible_domain' => '/\A[a-z0-9]([a-z0-9.-]*[a-z0-9])?\z/i',
        'amplitude_api_key' => '/\A[a-z0-9]+\z/i',
        'clarity_project_id' => '/\A[a-z0-9]+\z/i',
        'meta_pixel_id' => '/\A\d+\z/',
    ];

    /** @var list<string> */
    public const CONFIG_JSON_KEYS = [
        'allowed_locales', 'default_locale', 'draft_locales', 'website_token', 'social_profiles',
        'layout', 'locale_translations', 'popular_content', 'analytics',
    ];

    protected $fillable = [
        'account_id', 'name', 'slug', 'custom_domain', 'color', 'homepage_link', 'page_title',
        'header_text', 'config', 'archived', 'channel_web_widget_id', 'ssl_settings',
    ];

    protected $attributes = [
        'archived' => false,
        'config' => '{"allowed_locales":["en"]}',
        'ssl_settings' => '{}',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'ssl_settings' => 'array',
            'archived' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Portal $portal) {
            $portal->normalizeEmptyStrings();
            $portal->ensureSlug();
            $portal->normalizeConfig();
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }

    public function inboxes(): HasMany
    {
        return $this->hasMany(Inbox::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'portal_members');
    }

    public function channelWebWidget(): BelongsTo
    {
        return $this->belongsTo(WebWidget::class, 'channel_web_widget_id');
    }

    public function logo(): MorphOne
    {
        return $this->morphOne(Attachment::class, 'attachable');
    }

    /** @param Builder<static> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('archived', false);
    }

    protected function color(): Attribute
    {
        return Attribute::make(get: fn (?string $value) => ($value === null || $value === '') ? self::DEFAULT_COLOR : $value);
    }

    /** @return list<string> */
    public function validationMessages(): array
    {
        // before_validation của bản gốc chạy trước mọi validate.
        $this->normalizeEmptyStrings();
        $this->ensureSlug();
        $this->normalizeConfig();

        $messages = [];

        if ($this->account_id === null) {
            $messages[] = "Account can't be blank";
        }

        if ((string) $this->name === '') {
            $messages[] = "Name can't be blank";
        }

        if ((string) $this->slug === '') {
            $messages[] = "Slug can't be blank";
        }

        if (is_string($this->color) && $this->color !== '' && preg_match('/\A#(?:[0-9a-f]{3}|[0-9a-f]{6})\z/i', $this->color) !== 1) {
            $messages[] = 'Color is invalid';
        }

        return [...$messages, ...$this->configMessages(), ...$this->analyticsMessages(), ...$this->lengthMessages([
            'name' => 255, 'slug' => 255, 'custom_domain' => 255, 'page_title' => 255, 'header_text' => 20000,
        ])];
    }

    /** @return list<string> */
    private function configMessages(): array
    {
        $messages = [];
        $deniedKeys = array_values(array_diff(array_keys($this->config ?? []), self::CONFIG_JSON_KEYS));

        if ($deniedKeys !== []) {
            $messages[] = 'Config in portal on '.implode(',', $deniedKeys).' is not supported.';
        }

        if ($this->isDraftLocale($this->defaultLocale())) {
            $messages[] = 'Config default locale cannot be drafted.';
        }

        foreach ($this->localeTranslations() as $fields) {
            $unknown = array_diff(array_keys(is_array($fields) ? $fields : []), ['name', 'page_title', 'header_text']);

            if ($unknown !== []) {
                $messages[] = 'Config locale translations on '.implode(',', $unknown).' is not supported.';
            }
        }

        return $messages;
    }

    /** @return list<string> */
    private function analyticsMessages(): array
    {
        $messages = [];

        foreach (self::ANALYTICS_CONFIG_FORMATS as $key => $format) {
            $value = $this->analytics()[$key] ?? null;

            if ($value === null || $value === '') {
                continue;
            }

            if (preg_match(self::toPcre($format), (string) $value) !== 1) {
                $messages[] = 'Config '.self::humanize($key).' is invalid';
            }
        }

        return $messages;
    }

    // Khuôn của bản gốc dùng \A \z của Ruby; PCRE cần \A \z tương đương ^ $ tuyệt đối.
    private static function toPcre(string $rubyRegex): string
    {
        return str_replace(['\A', '\z'], ['^', '$'], $rubyRegex);
    }

    /** @return array<string, mixed> */
    public function analytics(): array
    {
        $value = $this->configValue('analytics');

        return is_array($value) ? $value : [];
    }

    /** @return array<string, mixed> */
    public function socialProfiles(): array
    {
        $value = $this->configValue('social_profiles');

        return is_array($value) ? $value : [];
    }

    /** @return array<string, mixed> */
    public function localeTranslations(): array
    {
        $value = $this->configValue('locale_translations');

        return is_array($value) ? $value : [];
    }

    /** @return array<string, mixed> */
    public function popularContent(): array
    {
        $value = $this->configValue('popular_content');

        return is_array($value) ? $value : [];
    }

    public function layout(): string
    {
        $layout = $this->configValue('layout');

        return (is_string($layout) && $layout !== '') ? $layout : 'classic';
    }

    public function defaultLocale(): string
    {
        $configured = $this->configValue('default_locale');

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        return $this->allowedLocaleCodes()[0] ?? 'en';
    }

    /** @return list<string> */
    public function allowedLocaleCodes(): array
    {
        $codes = self::normalizeLocaleCodes($this->configValue('allowed_locales'));

        if ($codes !== []) {
            return $codes;
        }

        $configured = $this->configValue('default_locale');

        return [is_string($configured) && $configured !== '' ? $configured : 'en'];
    }

    /** @return list<string> */
    public function draftLocaleCodes(): array
    {
        $drafted = self::normalizeLocaleCodes($this->configValue('draft_locales'));

        return array_values(array_filter($this->allowedLocaleCodes(), fn (string $locale) => in_array($locale, $drafted, true)));
    }

    /** @return list<string> */
    public function publicLocaleCodes(): array
    {
        return array_values(array_diff($this->allowedLocaleCodes(), $this->draftLocaleCodes()));
    }

    public function isDraftLocale(string $locale): bool
    {
        return in_array($locale, $this->draftLocaleCodes(), true);
    }

    public function displayTitle(?string $locale = null): ?string
    {
        $locale ??= $this->defaultLocale();

        return $this->localizedValue('page_title', $locale) ?: $this->localizedValue('name', $locale);
    }

    // Giá trị cấp portal cho một locale: override của locale đó → override của
    // locale mặc định → cột gốc.
    public function localizedValue(string $field, ?string $locale = null): ?string
    {
        $locale ??= $this->defaultLocale();
        $translations = $this->localeTranslations();

        foreach ([$locale, $this->defaultLocale()] as $candidate) {
            $value = $translations[$candidate][$field] ?? null;

            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return $this->getAttribute($field);
    }

    /** @return list<int> */
    public function popularCategoryIds(?string $locale = null): array
    {
        return $this->popularIds('category_ids', $locale, self::POPULAR_CATEGORY_LIMIT);
    }

    /** @return list<int> */
    public function popularArticleIds(?string $locale = null): array
    {
        return $this->popularIds('article_ids', $locale, self::POPULAR_ARTICLE_LIMIT);
    }

    /** @return list<int> */
    private function popularIds(string $key, ?string $locale, int $limit): array
    {
        $locale ??= $this->defaultLocale();
        $ids = $this->popularContent()[$locale][$key] ?? [];

        return array_slice(array_map('intval', is_array($ids) ? $ids : []), 0, $limit);
    }

    /** file_base_data — hình dạng jbuilder `logo`. @return array<string, mixed>|null */
    public function fileBaseData(): ?array
    {
        $logo = $this->logo;

        if ($logo === null) {
            return null;
        }

        return [
            'id' => $logo->id,
            'portal_id' => $this->id,
            'file_type' => $logo->content_type,
            'account_id' => $this->account_id,
            'file_url' => $logo->fileUrl(),
            'blob_id' => $logo->id,
            'filename' => (string) $logo->filename,
        ];
    }

    private function normalizeEmptyStrings(): void
    {
        foreach (['custom_domain', 'homepage_link'] as $attribute) {
            if ((string) $this->getAttribute($attribute) === '') {
                $this->setAttribute($attribute, null);
            }
        }
    }

    // Người dùng không điền slug: sinh từ tên, duy nhất toàn hệ thống.
    private function ensureSlug(): void
    {
        if ((string) $this->slug !== '') {
            return;
        }

        $this->slug = SlugGenerator::unique(
            $this->name,
            fn (string $candidate) => self::query()->where('slug', $candidate)->whereKeyNot($this->id ?? 0)->exists(),
        );
    }

    // normalize_config: giữ nguyên các khóa đã lưu nếu payload không nhắc tới,
    // rồi chốt lại ba khóa locale.
    private function normalizeConfig(): void
    {
        $persisted = $this->getRawOriginal('config');
        $persisted = is_string($persisted) ? (json_decode($persisted, true) ?: []) : (is_array($persisted) ? $persisted : []);

        $config = array_merge($persisted, is_array($this->config) ? $this->config : []);
        $this->config = $config;

        $config['allowed_locales'] = $this->allowedLocaleCodes();
        $config['default_locale'] = $this->defaultLocale();
        $config['draft_locales'] = $this->draftLocaleCodes();

        $this->config = $config;
    }

    private function configValue(string $key): mixed
    {
        $config = $this->config;

        return is_array($config) ? ($config[$key] ?? null) : null;
    }

    /** @return list<string> */
    private static function normalizeLocaleCodes(mixed $codes): array
    {
        if (! is_array($codes)) {
            return [];
        }

        return array_values(array_unique(array_filter(array_map('strval', $codes), fn (string $code) => $code !== '')));
    }
}
