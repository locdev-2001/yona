<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when an optimistic-concurrency update loses the race (BR-X08): the
 * record's lock_version changed since it was read. The caller should reload and
 * retry. Mapped to HTTP 409 in bootstrap/app.php.
 */
class StaleModelException extends RuntimeException
{
    public function __construct(public string $model, public mixed $id)
    {
        parent::__construct("Stale update on [{$model}] #{$id}: the record was modified by someone else. Reload and try again.");
    }
}
