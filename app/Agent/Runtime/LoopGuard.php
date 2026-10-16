<?php

namespace App\Agent\Runtime;

use App\Agent\ValueObjects\ToolCall;

// Phanh của vòng lượt: trần số lần gọi mô hình kèm một bước ân hạn chỉ dành cho công cụ
// kết thúc, và dừng khi cùng (công cụ, tham số đã sắp khoá, băm kết quả) lặp liền nhau
// hoặc cả một chu kỳ ngắn các lời gọi lặp lại đủ số vòng.
final class LoopGuard
{
    public const IDENTICAL_CALL_THRESHOLD = 3;

    public const MAX_CYCLE_PERIOD = 4;

    private int $steps = 0;

    /** @var list<string> chữ ký (công cụ, tham số, kết quả) theo thứ tự quan sát */
    private array $history = [];

    private bool $halted = false;

    public function __construct(private readonly int $maxSteps) {}

    public function stepsTaken(): int
    {
        return $this->steps;
    }

    // Còn được gọi mô hình không: tới trần thì còn đúng một bước ân hạn.
    public function mayCallModel(): bool
    {
        return $this->steps <= $this->maxSteps;
    }

    public function isGraceStep(): bool
    {
        return $this->steps === $this->maxSteps;
    }

    public function countModelCall(): void
    {
        $this->steps++;
    }

    // Khoá (công cụ, tham số đã sắp khoá) của một lời gọi, bất kể thứ tự khoá mô hình phát.
    public static function fingerprint(ToolCall $call): string
    {
        return $call->name."\n".self::canonical($call->args);
    }

    public function observe(ToolCall $call, string $result): void
    {
        $this->history[] = hash('sha256', self::fingerprint($call)."\n".$result);

        if ($this->identicalStreak() >= self::IDENTICAL_CALL_THRESHOLD || $this->repeatingCycle()) {
            $this->halted = true;
        }
    }

    public function halted(): bool
    {
        return $this->halted;
    }

    private function identicalStreak(): int
    {
        $last = end($this->history);
        $streak = 0;

        for ($index = count($this->history) - 1; $index >= 0 && $this->history[$index] === $last; $index--) {
            $streak++;
        }

        return $streak;
    }

    // Chu kỳ độ dài 2..MAX lặp đủ số vòng ngưỡng ở đuôi lịch sử.
    private function repeatingCycle(): bool
    {
        $count = count($this->history);

        for ($period = 2; $period <= self::MAX_CYCLE_PERIOD; $period++) {
            if ($count < $period * self::IDENTICAL_CALL_THRESHOLD) {
                continue;
            }

            $lap = array_slice($this->history, -$period);
            $laps = 1;

            while ($laps < self::IDENTICAL_CALL_THRESHOLD
                && array_slice($this->history, $count - $period * ($laps + 1), $period) === $lap) {
                $laps++;
            }

            if ($laps >= self::IDENTICAL_CALL_THRESHOLD) {
                return true;
            }
        }

        return false;
    }

    // JSON tất định: khoá object sắp theo tên ở mọi tầng.
    private static function canonical(mixed $value): string
    {
        $sort = function (mixed $node) use (&$sort): mixed {
            if (! is_array($node)) {
                return $node;
            }

            if (! array_is_list($node)) {
                ksort($node);
            }

            return array_map($sort, $node);
        };

        return (string) json_encode($sort($value), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
