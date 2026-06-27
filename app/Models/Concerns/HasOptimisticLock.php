<?php

namespace App\Models\Concerns;

/** Shim — di dời sang Modules\Shared\Concerns\HasOptimisticLock. ponytail: xóa sau phase 04/05. */
trait HasOptimisticLock
{
    use \Modules\Shared\Concerns\HasOptimisticLock;
}
