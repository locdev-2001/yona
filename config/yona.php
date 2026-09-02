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

    /*
    |--------------------------------------------------------------------------
    | Legal links
    |--------------------------------------------------------------------------
    |
    | Tương đương TERMS_URL / PRIVACY_URL trong installation config Chatwoot —
    | hiện dưới nút đăng ký.
    |
    */

    'terms_url' => env('TERMS_URL', 'https://yona.vn/terms'),
    'privacy_url' => env('PRIVACY_URL', 'https://yona.vn/privacy-policy'),

    /*
    |--------------------------------------------------------------------------
    | Presence
    |--------------------------------------------------------------------------
    |
    | Tương đương PRESENCE_DURATION / CONTACT_PRESENCE_DURATION của
    | OnlineStatusTracker (giây). Widget ping mỗi 60s nên contact cần cửa sổ
    | dài hơn agent.
    |
    */

    'presence_duration' => (int) env('PRESENCE_DURATION', 20),
    'contact_presence_duration' => (int) env('CONTACT_PRESENCE_DURATION', 90),

];
