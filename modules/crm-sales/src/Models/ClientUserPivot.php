<?php

namespace Modules\CrmSales\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Custom pivot for client_user (customer-admin delegation).
 * HasUuids auto-generates UUID for the `id` primary key on insert.
 */
class ClientUserPivot extends Pivot
{
    use HasUuids;

    protected $table = 'client_user';

    public $incrementing = false;
}
