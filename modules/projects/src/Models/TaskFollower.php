<?php

namespace Modules\Projects\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Custom pivot model for task_followers — provides HasUuids so the UUID PK
 * is generated on sync()/attach() inserts.
 */
class TaskFollower extends Pivot
{
    use HasUuids;

    protected $table = 'task_followers';

    public $incrementing = false;

    protected $keyType = 'string';
}
