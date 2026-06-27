<?php

namespace Modules\Identity\Models\Concerns;

use Modules\Identity\Support\Audit\Audit;
use Illuminate\Database\Eloquent\Model;

/**
 * Records create/update/delete/restore of a model to the append-only audit log
 * (BR-X05). Override auditPiiAttributes() to reference (not copy) PII fields.
 *
 * @phpstan-require-extends Model
 */
trait Auditable
{
    protected static function bootAuditable(): void
    {
        static::created(fn (Model $model) => Audit::log($model, 'create'));
        static::updated(fn (Model $model) => Audit::log($model, 'update'));
        static::deleted(fn (Model $model) => Audit::log($model, 'delete'));
        static::registerModelEvent('restored', fn (Model $model) => Audit::log($model, 'restore'));
    }

    /**
     * PII attribute names stored as a reference (not raw value) in audit diffs.
     *
     * @return list<string>
     */
    public function auditPiiAttributes(): array
    {
        return [];
    }
}
