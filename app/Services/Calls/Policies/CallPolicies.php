<?php

namespace App\Services\Calls\Policies;

use App\Services\Calls\CallKind;
use Illuminate\Contracts\Container\Container;

final readonly class CallPolicies
{
    public function __construct(private Container $container) {}

    public function for(CallKind $kind): CallPolicy
    {
        return $this->container->make(match ($kind) {
            CallKind::GroupRoom => GroupRoomPolicy::class,
            CallKind::Direct => DirectCallPolicy::class,
        });
    }
}
