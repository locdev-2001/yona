<?php

namespace App\Http\Resources;

use App\Models\Call;

final class CallResource
{
    /** @return array<string, mixed> */
    public static function from(Call $call): array
    {
        return [
            'id' => $call->id,
            'kind' => $call->kind,
            'media' => $call->media->value,
            'status' => $call->status->value,
            'started_at' => $call->started_at?->toIso8601String(),
            'ended_at' => $call->ended_at?->toIso8601String(),
        ];
    }
}
