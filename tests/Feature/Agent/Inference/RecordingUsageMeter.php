<?php

namespace Tests\Feature\Agent\Inference;

use App\Agent\Contracts\Ports\UsageMeter;
use App\Agent\ValueObjects\UsageIncrement;
use RuntimeException;

final class RecordingUsageMeter implements UsageMeter
{
    /** @var list<UsageIncrement> */
    public array $increments = [];

    public function __construct(private readonly bool $fails = false) {}

    public function add(UsageIncrement $increment): void
    {
        if ($this->fails) {
            throw new RuntimeException('ai_usage_analytics is unavailable');
        }

        $this->increments[] = $increment;
    }
}
