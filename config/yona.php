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

    /*
    |--------------------------------------------------------------------------
    | Blocked email domains
    |--------------------------------------------------------------------------
    |
    | Tương đương BLOCKED_EMAIL_DOMAINS của Chatwoot — mỗi dòng một pattern,
    | so khớp regex với domain email đăng ký.
    |
    */

    'blocked_email_domains' => env('BLOCKED_EMAIL_DOMAINS', ''),

];
