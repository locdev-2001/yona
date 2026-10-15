<?php

namespace App\Agent\Runtime;

use InvalidArgumentException;

// Khoá `turn` của config/agent.php đã kiểm, một chỗ đọc duy nhất cho Runtime.
final readonly class TurnSettings
{
    private const MICRO_USD_PER_USD = 1_000_000;

    /** @param array<string, int> $debounceSeconds loại kênh => giây im lặng */
    public function __construct(
        public bool $enabled,
        public string $queue,
        public int $deadlineSeconds,
        public int $floorGraceSeconds,
        public int $jobTimeoutSeconds,
        public int $lockReleaseSeconds,
        public int $lockExpireSeconds,
        public int $maxWaitSeconds,
        public int $maxSteps,
        public array $debounceSeconds,
        public int $historyMessages,
        public int $historyMaxTokens,
        public int $historyDropChunk,
        public int $dailyBudgetMicroUsd,
    ) {
        if (! ($deadlineSeconds + $floorGraceSeconds <= $jobTimeoutSeconds && $jobTimeoutSeconds < $lockExpireSeconds)) {
            throw new InvalidArgumentException('Turn timing must hold: deadline + floor grace <= job timeout < lock expiry.');
        }

        if ($maxSteps < 1 || $historyMessages < 1 || $historyDropChunk < 1 || ! isset($debounceSeconds['default'])) {
            throw new InvalidArgumentException('Turn settings need max_steps, history sizes and a default debounce.');
        }
    }

    /** @param array<string, mixed> $turn */
    public static function fromConfig(array $turn): self
    {
        return new self(
            enabled: (bool) ($turn['enabled'] ?? true),
            queue: (string) $turn['queue'],
            deadlineSeconds: (int) $turn['deadline_seconds'],
            floorGraceSeconds: (int) $turn['floor_grace_seconds'],
            jobTimeoutSeconds: (int) $turn['job_timeout_seconds'],
            lockReleaseSeconds: (int) $turn['lock_release_seconds'],
            lockExpireSeconds: (int) $turn['lock_expire_seconds'],
            maxWaitSeconds: (int) $turn['max_wait_seconds'],
            maxSteps: (int) $turn['max_steps'],
            debounceSeconds: array_map('intval', (array) $turn['debounce_seconds']),
            historyMessages: (int) $turn['history']['messages'],
            historyMaxTokens: (int) $turn['history']['max_tokens'],
            historyDropChunk: (int) $turn['history']['drop_chunk'],
            dailyBudgetMicroUsd: (int) round(((float) $turn['daily_budget_usd']) * self::MICRO_USD_PER_USD),
        );
    }

    public function debounceFor(string $channel): int
    {
        return $this->debounceSeconds[$channel] ?? $this->debounceSeconds['default'];
    }
}
