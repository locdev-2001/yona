<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\AiAgentProfile;

interface AiAgentDirectory
{
    // null khi AI agent không thuộc account đó hoặc đã xoá.
    public function profile(int $accountId, int $aiAgentId): ?AiAgentProfile;
}
