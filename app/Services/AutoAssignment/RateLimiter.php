<?php

namespace App\Services\AutoAssignment;

use App\Models\AssignmentPolicy;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\Redis;

// Port từ refs/chatwoot/app/services/auto_assignment/rate_limiter.rb + khóa
// ASSIGNMENT_KEY / ASSIGNMENT_KEY_PATTERN của lib/redis/redis_keys.rb.
// Đếm số hội thoại đã giao cho một agent trong cửa sổ thời gian của chính sách.
final class RateLimiter
{
    public const ASSIGNMENT_KEY = 'ASSIGNMENT::%d::AGENT::%d::CONVERSATION::%d';

    public const ASSIGNMENT_KEY_PATTERN = 'ASSIGNMENT::%d::AGENT::%d::*';

    public const DEFAULT_LIMIT = 5;

    public const DEFAULT_WINDOW_SECONDS = 300;

    public function __construct(
        private readonly Inbox $inbox,
        private readonly User $agent,
    ) {}

    public function withinLimit(): bool
    {
        return $this->currentCount() < $this->limit();
    }

    public function trackAssignment(Conversation $conversation): void
    {
        Redis::setex($this->assignmentKey($conversation->id), $this->window(), (string) $conversation->id);
    }

    public function currentCount(): int
    {
        return count(Redis::keys($this->assignmentKeyPattern()));
    }

    private function limit(): int
    {
        $limit = $this->policy()?->fair_distribution_limit;

        return filled($limit) ? (int) $limit : self::DEFAULT_LIMIT;
    }

    private function window(): int
    {
        $window = $this->policy()?->fair_distribution_window;

        return $window === null ? self::DEFAULT_WINDOW_SECONDS : (int) $window;
    }

    private function policy(): ?AssignmentPolicy
    {
        return $this->inbox->assignmentPolicy;
    }

    private function assignmentKey(int $conversationId): string
    {
        return sprintf(self::ASSIGNMENT_KEY, $this->inbox->id, $this->agent->id, $conversationId);
    }

    private function assignmentKeyPattern(): string
    {
        return sprintf(self::ASSIGNMENT_KEY_PATTERN, $this->inbox->id, $this->agent->id);
    }
}
