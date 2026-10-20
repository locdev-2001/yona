<?php

namespace App\Services\Calls;

use App\Models\Call;
use App\Services\Calls\Media\JoinTicket;

final readonly class CallJoin
{
    public function __construct(
        public Call $call,
        public JoinTicket $ticket,
    ) {}
}
