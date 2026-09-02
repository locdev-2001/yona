<?php

namespace App\Events;

use Illuminate\Database\Eloquent\Model;

// Rails `previous_changes` = {attr => [giá trị cũ, giá trị mới]} — gọi trong
// hook `updated`/`created` (Eloquent chưa syncOriginal nên getOriginal còn
// giá trị cũ, getChanges đã có giá trị mới).
final class PreviousChanges
{
    /** @return array<string, array{0: mixed, 1: mixed}> */
    public static function of(Model $model): array
    {
        $changes = [];

        foreach (array_keys($model->getChanges()) as $attribute) {
            $changes[$attribute] = [$model->getOriginal($attribute), $model->getAttribute($attribute)];
        }

        return $changes;
    }
}
