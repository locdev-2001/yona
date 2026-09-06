<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\Redis;

// Port từ refs/chatwoot/app/models/concerns/reauthorizable.rb — đếm lỗi xác thực
// của dịch vụ ngoài trong Redis, quá ngưỡng thì bật cờ "cần cấp quyền lại".
// Ngưỡng do chính lớp dùng trait khai qua hằng AUTHORIZATION_ERROR_THRESHOLD.
trait Reauthorizable
{
    public function reauthorizationRequired(): bool
    {
        return filled(Redis::get($this->reauthorizationRequiredKey()));
    }

    public function authorizationErrorCount(): int
    {
        return (int) Redis::get($this->authorizationErrorCountKey());
    }

    public function authorizationError(): void
    {
        Redis::incr($this->authorizationErrorCountKey());

        if ($this->authorizationErrorCount() >= static::AUTHORIZATION_ERROR_THRESHOLD) {
            $this->promptReauthorization();
        }
    }

    public function promptReauthorization(): void
    {
        Redis::set($this->reauthorizationRequiredKey(), true);
    }

    public function reauthorized(): void
    {
        Redis::del($this->authorizationErrorCountKey());
        Redis::del($this->reauthorizationRequiredKey());
    }

    // lib/redis/redis_keys.rb: AUTHORIZATION_ERROR_COUNT / REAUTHORIZATION_REQUIRED.
    private function authorizationErrorCountKey(): string
    {
        return "AUTHORIZATION_ERROR_COUNT::{$this->redisObjectType()}::{$this->getKey()}";
    }

    private function reauthorizationRequiredKey(): string
    {
        return "REAUTHORIZATION_REQUIRED::{$this->redisObjectType()}::{$this->getKey()}";
    }

    private function redisObjectType(): string
    {
        return str_replace('::', '_', strtolower($this->getMorphClass()));
    }
}
