<?php

namespace App\Exceptions\Account;

use Exception;

class InviteLinkUnusable extends Exception
{
    public function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }
}
