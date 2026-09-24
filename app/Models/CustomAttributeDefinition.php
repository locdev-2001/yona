<?php

namespace App\Models;

use Database\Factories\CustomAttributeDefinitionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

// Bỏ: đồng bộ pre-chat field của widget + invalidate cache đếm chưa đọc theo
// filter (FilteredCountInvalidator chưa được port).
class CustomAttributeDefinition extends Model
{
    /** @use HasFactory<CustomAttributeDefinitionFactory> */
    use HasFactory;

    public const MODEL_CONVERSATION = 'conversation_attribute';

    public const MODEL_CONTACT = 'contact_attribute';

    public const MODEL_COMPANY = 'company_attribute';

    /** @var array<string, int> */
    public const ATTRIBUTE_MODELS = [
        self::MODEL_CONVERSATION => 0,
        self::MODEL_CONTACT => 1,
        self::MODEL_COMPANY => 2,
    ];

    /** @var array<string, int> */
    public const DISPLAY_TYPES = [
        'text' => 0,
        'number' => 1,
        'currency' => 2,
        'percent' => 3,
        'link' => 4,
        'date' => 5,
        'list' => 6,
        'checkbox' => 7,
    ];

    // STANDARD_ATTRIBUTES — key trùng thuộc tính chuẩn thì bị từ chối.
    /** @var array<string, list<string>> */
    public const STANDARD_ATTRIBUTES = [
        self::MODEL_CONVERSATION => [
            'status', 'priority', 'assignee_id', 'inbox_id', 'team_id', 'display_id', 'campaign_id',
            'labels', 'browser_language', 'country_code', 'referer', 'created_at', 'last_activity_at',
        ],
        self::MODEL_CONTACT => [
            'name', 'email', 'phone_number', 'identifier', 'country_code', 'city', 'company_name',
            'created_at', 'last_activity_at', 'referer', 'blocked',
        ],
        self::MODEL_COMPANY => [
            'name', 'domain', 'description', 'contacts_count', 'created_at', 'updated_at', 'last_activity_at',
        ],
    ];

    // format: { with: /\A[\p{L}\p{N}_.\-]+\z/ } — chữ Unicode, số, `_`, `.`, `-`.
    public const KEY_FORMAT = '/^[\p{L}\p{N}_.\-]+$/u';

    protected $fillable = [
        'account_id', 'attribute_display_name', 'attribute_description', 'attribute_display_type',
        'attribute_key', 'attribute_model', 'attribute_values', 'default_value', 'regex_pattern', 'regex_cue',
    ];

    protected $attributes = [
        'attribute_display_type' => 0,
        'attribute_model' => 0,
        'attribute_values' => '[]',
    ];

    protected function casts(): array
    {
        return ['attribute_values' => 'array'];
    }

    // before_validation :normalize_attribute_fields
    protected static function booted(): void
    {
        static::saving(function (CustomAttributeDefinition $definition) {
            foreach (['attribute_key', 'attribute_display_name'] as $field) {
                if (is_string($definition->{$field})) {
                    $definition->{$field} = trim($definition->{$field});
                }
            }
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    // enum attribute_model — cột số, API nói chuỗi.
    protected function attributeModel(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value) => array_flip(self::ATTRIBUTE_MODELS)[(int) ($value ?? 0)] ?? self::MODEL_CONVERSATION,
            set: fn (mixed $value) => self::enumValue(self::ATTRIBUTE_MODELS, $value),
        );
    }

    protected function attributeDisplayType(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value) => array_flip(self::DISPLAY_TYPES)[(int) ($value ?? 0)] ?? 'text',
            set: fn (mixed $value) => self::enumValue(self::DISPLAY_TYPES, $value),
        );
    }

    /** @param Builder<static> $query */
    public function scopeWithAttributeModel(Builder $query, ?string $attributeModel): Builder
    {
        return $attributeModel === null || $attributeModel === ''
            ? $query
            : $query->where('attribute_model', self::enumValue(self::ATTRIBUTE_MODELS, $attributeModel));
    }

    /** Định nghĩa của một key trong account, theo đúng model — null nếu không có. */
    public static function lookup(int $accountId, string $attributeModel, string $attributeKey): ?self
    {
        return self::query()
            ->where('account_id', $accountId)
            ->where('attribute_model', self::enumValue(self::ATTRIBUTE_MODELS, $attributeModel))
            ->where('attribute_key', $attributeKey)
            ->first();
    }

    public function conflictsWithStandardAttribute(): bool
    {
        return in_array(
            (string) $this->attribute_key,
            self::STANDARD_ATTRIBUTES[$this->attribute_model] ?? [],
            true,
        );
    }

    public function hasValidKeyFormat(): bool
    {
        return is_string($this->attribute_key)
            && $this->attribute_key !== ''
            && preg_match(self::KEY_FORMAT, $this->attribute_key) === 1;
    }

    /**
     * Lệnh founder: người dùng không nhập key. Sinh slug ASCII không dấu từ tên
     * hiển thị, tự tránh key đã dùng trong account+model và thuộc tính chuẩn.
     */
    public static function generateKey(int $accountId, string $attributeModel, string $displayName): string
    {
        $base = Str::slug(trim($displayName), '_');

        if ($base === '') {
            $base = 'attribute';
        }

        $taken = self::query()
            ->where('account_id', $accountId)
            ->where('attribute_model', self::enumValue(self::ATTRIBUTE_MODELS, $attributeModel))
            ->pluck('attribute_key')
            ->merge(self::STANDARD_ATTRIBUTES[$attributeModel] ?? [])
            ->all();

        $candidate = $base;
        $suffix = 1;

        while (in_array($candidate, $taken, true)) {
            $suffix++;
            $candidate = "{$base}_{$suffix}";
        }

        return $candidate;
    }

    /** @param array<string, int> $enum */
    private static function enumValue(array $enum, mixed $value): int
    {
        if (is_int($value) || (is_string($value) && is_numeric($value))) {
            return in_array((int) $value, $enum, true) ? (int) $value : 0;
        }

        return $enum[(string) $value] ?? 0;
    }
}
