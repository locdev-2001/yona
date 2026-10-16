<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Query\Expression;
use InvalidArgumentException;

// Số liệu tổng kết của nhân viên AI theo kỳ: mỗi (kỳ, đầu kỳ UTC, account, nhân viên AI)
// một dòng. Mọi lần ghi đi qua accumulate(): cộng dồn nguyên tử ngay khi phát sinh vào
// dòng `hour`. ai_agent_id không có khoá ngoại để xoá nhân viên AI vẫn giữ số liệu.
class AiUsageAnalytic extends Model
{
    public const PERIOD_HOUR = 'hour';

    public const PERIOD_DAY = 'day';

    public const COUNTERS = [
        'turns',
        'replies',
        'handoffs',
        'failed_turns',
        'model_calls',
        'failed_calls',
        'route_changes',
        'latency_ms_total',
        'input_tokens',
        'output_tokens',
        'cache_read_tokens',
        'cache_write_tokens',
        'cost_micro_usd',
    ];

    private const UNIQUE_BY = ['period', 'period_start', 'account_id', 'ai_agent_id'];

    protected $table = 'ai_usage_analytics';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return array_fill_keys(self::COUNTERS, 'integer') + ['period_start' => 'immutable_datetime'];
    }

    /**
     * Cộng các bộ đếm vào dòng giờ chứa `$at` (INSERT … ON CONFLICT … DO UPDATE SET
     * x = x + EXCLUDED.x): hai lần ghi cùng giờ không bao giờ đè nhau.
     *
     * @param  array<string, int>  $deltas  bộ đếm => số cộng thêm, khoá thuộc COUNTERS
     */
    public static function accumulate(int $accountId, int $aiAgentId, array $deltas, DateTimeInterface $at): void
    {
        $unknown = array_diff(array_keys($deltas), self::COUNTERS);

        if ($unknown !== []) {
            throw new InvalidArgumentException('Unknown AI usage counters: '.implode(', ', $unknown).'.');
        }

        foreach ($deltas as $value) {
            if ($value < 0) {
                throw new InvalidArgumentException('AI usage counters only grow.');
            }
        }

        $deltas = array_filter($deltas);

        if ($deltas === []) {
            return;
        }

        $row = [
            'period' => self::PERIOD_HOUR,
            'period_start' => self::periodStart(self::PERIOD_HOUR, $at),
            'account_id' => $accountId,
            'ai_agent_id' => $aiAgentId,
            ...$deltas,
        ];
        $increments = array_combine(
            array_keys($deltas),
            array_map(fn (string $column) => new Expression("ai_usage_analytics.{$column} + excluded.{$column}"), array_keys($deltas)),
        );

        // Savepoint khi bên gọi đang mở transaction: lần ghi hỏng không kéo transaction đó hỏng theo.
        (new static)->getConnection()->transaction(fn () => static::query()->upsert([$row], self::UNIQUE_BY, $increments));
    }

    // Đầu kỳ chứa `$at`, theo UTC.
    public static function periodStart(string $period, DateTimeInterface $at): CarbonImmutable
    {
        $utc = CarbonImmutable::instance($at)->utc();

        return match ($period) {
            self::PERIOD_HOUR => $utc->startOfHour(),
            self::PERIOD_DAY => $utc->startOfDay(),
            default => throw new InvalidArgumentException("Unknown AI usage period [{$period}]."),
        };
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
