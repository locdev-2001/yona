<?php

namespace Modules\Shared\Concerns;

use App\Exceptions\StaleModelException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Optimistic concurrency (BR-X08): every update is constrained to the
 * lock_version it was read at, and bumps it. A losing race updates 0 rows and
 * raises StaleModelException instead of silently overwriting (last-write-wins).
 *
 * Requires an integer `lock_version` column.
 *
 * @phpstan-require-extends Model
 */
trait HasOptimisticLock
{
    protected static function bootHasOptimisticLock(): void
    {
        // Materialise lock_version (= 0) on insert so the model + its original
        // snapshot carry it — otherwise the first update's guard compares
        // against NULL and falsely reports a stale write.
        static::creating(function (Model $model): void {
            if ($model->getAttribute('lock_version') === null) {
                $model->setAttribute('lock_version', 0);
            }
        });

        static::updating(function (Model $model): void {
            $model->setAttribute('lock_version', (int) $model->getOriginal('lock_version') + 1);
        });
    }

    /**
     * Mirror Model::performUpdate but constrain the write to the read
     * lock_version and reject it when no row matches (a concurrent change).
     *
     * @param  Builder<static>  $query
     */
    protected function performUpdate(Builder $query): bool
    {
        if ($this->fireModelEvent('updating') === false) {
            return false;
        }

        if ($this->usesTimestamps()) {
            $this->updateTimestamps();
        }

        $dirty = $this->getDirtyForUpdate();

        if (count($dirty) > 0) {
            $saveQuery = $this->setKeysForSaveQuery($query);

            if (array_key_exists('lock_version', $this->getOriginal())) {
                $saveQuery->where('lock_version', $this->getOriginal('lock_version'));
            }

            if ($saveQuery->update($dirty) === 0) {
                throw new StaleModelException(static::class, $this->getKey());
            }

            $this->syncChanges();
            $this->fireModelEvent('updated', false);
        }

        return true;
    }
}
