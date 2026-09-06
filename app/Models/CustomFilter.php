<?php

namespace App\Models;

use Database\Factories\CustomFilterFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port từ refs/chatwoot/app/models/custom_filter.rb.
// Bỏ: invalidate cache đếm chưa đọc theo filter (FilteredCountStore chưa port).
class CustomFilter extends Model
{
    /** @use HasFactory<CustomFilterFactory> */
    use HasFactory;

    // Limits::MAX_CUSTOM_FILTERS_PER_USER
    public const MAX_PER_USER = 1000;

    public const TYPE_CONVERSATION = 'conversation';

    public const TYPE_CONTACT = 'contact';

    public const TYPE_REPORT = 'report';

    /** @var array<string, int> */
    public const FILTER_TYPES = [
        self::TYPE_CONVERSATION => 0,
        self::TYPE_CONTACT => 1,
        self::TYPE_REPORT => 2,
    ];

    protected $fillable = ['account_id', 'user_id', 'name', 'filter_type', 'query'];

    protected $attributes = [
        'filter_type' => 0,
        'query' => '{}',
    ];

    protected function casts(): array
    {
        return ['query' => 'array'];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // enum filter_type — cột số, API nói chuỗi.
    protected function filterType(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value) => array_flip(self::FILTER_TYPES)[(int) ($value ?? 0)] ?? self::TYPE_CONVERSATION,
            set: fn (mixed $value) => self::filterTypeValue($value),
        );
    }

    public static function filterTypeValue(mixed $value): int
    {
        if (is_int($value) || (is_string($value) && is_numeric($value))) {
            return in_array((int) $value, self::FILTER_TYPES, true) ? (int) $value : 0;
        }

        return self::FILTER_TYPES[(string) $value] ?? 0;
    }

    // validate_number_of_filters
    public static function reachedLimit(int $accountId, int $userId): bool
    {
        return self::query()
            ->where('account_id', $accountId)
            ->where('user_id', $userId)
            ->count() >= self::MAX_PER_USER;
    }
}
