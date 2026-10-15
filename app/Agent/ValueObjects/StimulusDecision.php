<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

final readonly class StimulusDecision
{
    private function __construct(
        public StimulusDecisionKind $kind,
        public ?int $aiAgentId,
        public string $reason,
    ) {
        if (($kind === StimulusDecisionKind::Respond) !== ($aiAgentId !== null)) {
            throw new InvalidArgumentException('Only a Respond decision names the AI agent.');
        }
    }

    public static function ignore(string $reason): self
    {
        return new self(StimulusDecisionKind::Ignore, null, $reason);
    }

    public static function decline(string $reason): self
    {
        return new self(StimulusDecisionKind::Decline, null, $reason);
    }

    public static function respond(int $aiAgentId): self
    {
        return new self(StimulusDecisionKind::Respond, $aiAgentId, 'respond');
    }
}
