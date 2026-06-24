<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Custom pivot model for task_assignees — needed so HasUuids generates the UUID PK
 * when Eloquent sync()/attach() inserts rows (plain pivot tables don't run model events).
 */
class TaskAssignee extends Pivot
{
    use HasUuids;

    protected $table = 'task_assignees';

    public $incrementing = false;

    protected $keyType = 'string';
}
