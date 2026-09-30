<?php

namespace Tests\Support;

use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

/**
 * Đếm truy vấn SQL của một đoạn việc. Cơ chế duy nhất cho mọi test trần truy vấn:
 * N+1 quay lại thì số đếm vượt trần và test đỏ, kèm danh sách câu lặp để biết chỗ.
 */
final class QueryCounter
{
    /** @var list<array{sql: string, ms: float, at: string}> */
    private array $queries = [];

    private bool $recording = false;

    private static ?self $active = null;

    private static bool $listening = false;

    public static function measure(callable $work): self
    {
        $counter = new self;
        $counter->start();

        try {
            $work();
        } finally {
            $counter->stop();
        }

        return $counter;
    }

    public function start(): void
    {
        self::$active = $this;
        $this->recording = true;

        if (self::$listening) {
            return;
        }

        self::$listening = true;
        DB::listen(static function (QueryExecuted $query): void {
            self::$active?->record($query);
        });
    }

    public function stop(): void
    {
        $this->recording = false;
    }

    public function count(): int
    {
        return count($this->queries);
    }

    public function totalMs(): float
    {
        return round(array_sum(array_column($this->queries, 'ms')), 1);
    }

    /**
     * Câu SQL (đã bỏ số và chuỗi) chạy từ `$minimum` lần trở lên, nhiều nhất trước.
     *
     * @return array<string, int>
     */
    public function repeated(int $minimum = 2): array
    {
        $occurrences = [];

        foreach ($this->queries as $query) {
            $shape = self::shapeOf($query['sql']);
            $occurrences[$shape] = ($occurrences[$shape] ?? 0) + 1;
        }

        arsort($occurrences);

        return array_filter($occurrences, fn (int $times) => $times >= $minimum);
    }

    /** @return list<string> */
    public function statements(): array
    {
        return array_column($this->queries, 'sql');
    }

    /** @return list<string> Câu SQL kèm dòng mã ứng dụng đã phát ra nó. */
    public function statementsWithCaller(): array
    {
        return array_map(fn (array $query) => "{$query['sql']}  @ {$query['at']}", $this->queries);
    }

    public function report(): string
    {
        $lines = ["{$this->count()} truy vấn, {$this->totalMs()} ms SQL"];

        foreach ($this->repeated() as $shape => $times) {
            $lines[] = sprintf('  %3dx %s', $times, mb_substr($shape, 0, 220));
        }

        return implode(PHP_EOL, $lines);
    }

    private function record(QueryExecuted $query): void
    {
        if (! $this->recording) {
            return;
        }

        $this->queries[] = ['sql' => $query->sql, 'ms' => (float) $query->time, 'at' => self::callerInApp()];
    }

    /** Dòng mã ứng dụng gần nhất đã phát ra truy vấn — chỉ ra chỗ N+1 khi test trần đỏ. */
    private static function callerInApp(): string
    {
        foreach (debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS) as $frame) {
            $file = $frame['file'] ?? '';

            if (str_contains($file, '/app/') && ! str_contains($file, '/vendor/')) {
                return substr($file, strpos($file, '/app/') + 1).':'.($frame['line'] ?? 0);
            }
        }

        return '';
    }

    private static function shapeOf(string $sql): string
    {
        $withoutLiterals = preg_replace(["/'[^']*'/", '/\b\d+\b/'], ['?', '?'], $sql);

        return (string) preg_replace('/\(\s*\?(\s*,\s*\?)*\s*\)/', '(?…)', (string) $withoutLiterals);
    }
}
