<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/models/installation_config.rb — cấu hình toàn cài
// đặt. Giá trị nằm trong serialized_value.value; `locked` = không cho sửa ở
// màn Installation configs của Super Admin.
class InstallationConfig extends Model
{
    public const CAPTAIN_LLM_CONFIG_KEYS = [
        'CAPTAIN_OPEN_AI_API_KEY',
        'CAPTAIN_OPEN_AI_ENDPOINT',
        'CAPTAIN_OPEN_AI_MODEL',
    ];

    public const RESTART_REQUIRED_CONFIG_KEYS = [
        ...self::CAPTAIN_LLM_CONFIG_KEYS,
        'LANGFUSE_BASE_URL',
        'LANGFUSE_PUBLIC_KEY',
        'LANGFUSE_SECRET_KEY',
        'OTEL_PROVIDER',
    ];

    protected $fillable = ['name', 'value', 'serialized_value', 'locked'];

    protected function casts(): array
    {
        return [
            'serialized_value' => 'array',
            'locked' => 'boolean',
        ];
    }

    public function scopeEditable(Builder $query): Builder
    {
        return $query->where('locked', false);
    }

    public function getValueAttribute(): mixed
    {
        return $this->serialized_value['value'] ?? null;
    }

    public function setValueAttribute(mixed $value): void
    {
        $this->serialized_value = ['value' => $value];
    }

    public static function valueOf(string $name, mixed $default = null): mixed
    {
        $config = static::query()->where('name', $name)->first();

        return $config?->value ?? $default;
    }
}
