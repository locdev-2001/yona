<?php

namespace App\Services\Email\OAuth;

use RuntimeException;
use Throwable;

final class EmailOAuthException extends RuntimeException
{
    public function __construct(string $message, public readonly bool $revoked = false, ?Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
