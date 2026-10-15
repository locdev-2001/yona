<?php

namespace App\Models\Agent;

use LogicException;

final class MissingAccountScope extends LogicException
{
    /** @param class-string $modelClass */
    public static function on(string $modelClass): self
    {
        return new self("{$modelClass} query must filter by account_id explicitly.");
    }
}
