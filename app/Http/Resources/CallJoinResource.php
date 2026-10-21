<?php

namespace App\Http\Resources;

use App\Services\Calls\CallJoin;
use App\Services\Calls\Media\MediaSource;

final class CallJoinResource
{
    /** @return array<string, mixed> */
    public static function from(CallJoin $join): array
    {
        return [
            'call' => CallResource::from($join->call),
            'ticket' => $join->ticket?->toArray(),
            'awaiting_approval' => $join->isAwaitingApproval(),
            'publishable_sources' => array_map(fn (MediaSource $source) => $source->value, $join->permissions->publishableSources ?? []),
        ];
    }
}
