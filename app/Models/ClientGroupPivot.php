<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Custom pivot for client_group_client.
 * HasUuids auto-generates UUID for the `id` primary key on insert.
 */
class ClientGroupPivot extends Pivot
{
    use HasUuids;

    protected $table = 'client_group_client';

    public $incrementing = false;
}
