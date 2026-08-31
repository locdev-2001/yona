<?php

namespace App\Exceptions\Account;

use Exception;

class UserExists extends Exception
{
    public function __construct()
    {
        parent::__construct(__('auth.signup.user_exists'));
    }
}
