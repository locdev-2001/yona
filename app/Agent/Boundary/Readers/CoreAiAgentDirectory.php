<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Boundary\CoreRecords;
use App\Agent\Contracts\Ports\AiAgentDirectory;
use App\Agent\ValueObjects\AiAgentProfile;

final class CoreAiAgentDirectory implements AiAgentDirectory
{
    public function profile(int $accountId, int $aiAgentId): ?AiAgentProfile
    {
        $aiAgent = CoreRecords::aiAgent($accountId, $aiAgentId);

        return $aiAgent === null ? null : new AiAgentProfile(
            id: $aiAgent->id,
            name: (string) $aiAgent->name,
            persona: blank($aiAgent->persona) ? null : (string) $aiAgent->persona,
            instructions: blank($aiAgent->instructions) ? null : (string) $aiAgent->instructions,
        );
    }
}
