<?php

namespace App\Services\Admin\Alerts;

final readonly class AlertRuleDefaults
{
    public function __construct(
        public int $threshold,
        public int $windowMinutes,
        public int $cooldownMinutes,
        public bool $enabled = true,
    ) {}
}
