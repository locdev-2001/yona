<?php

namespace App\Exceptions\Account;

use Exception;

class InvalidEmail extends Exception
{
    public function __construct()
    {
        parent::__construct(__('auth.signup.invalid_email'));
    }
}
