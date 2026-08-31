<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Signup
    |--------------------------------------------------------------------------
    |
    | Tương đương ENABLE_ACCOUNT_SIGNUP của Chatwoot. Khi tắt, trang login
    | không hiện link "Create a new account" và route signup bị chặn.
    |
    */

    'signup_enabled' => env('ENABLE_ACCOUNT_SIGNUP', false),

];
