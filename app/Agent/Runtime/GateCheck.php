<?php

namespace App\Agent\Runtime;

use App\Agent\ValueObjects\CoreMessage;

final readonly class GateCheck
{
    /** @param list<CoreMessage> $pending tin lõi mới hơn snapshot của lượt */
    public function __construct(
        public ?BlockReason $block,
        public array $pending,
    ) {}
}
