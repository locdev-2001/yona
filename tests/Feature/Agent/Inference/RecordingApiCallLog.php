<?php

namespace Tests\Feature\Agent\Inference;

use App\Agent\Contracts\Ports\ApiCallLog;
use App\Agent\ValueObjects\ApiCallRecord;
use RuntimeException;

final class RecordingApiCallLog implements ApiCallLog
{
    /** @var list<ApiCallRecord> */
    public array $records = [];

    public function __construct(private readonly bool $fails = false) {}

    public function record(ApiCallRecord $call): void
    {
        if ($this->fails) {
            throw new RuntimeException('api_logs is unavailable');
        }

        $this->records[] = $call;
    }
}
