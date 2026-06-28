<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Zalo Personal Bridge (P07 channel-zalo)
    |--------------------------------------------------------------------------
    |
    | Secrets cho bridge Node.js (zca-js) → Laravel webhook.
    | bridge_url: base URL bridge HTTP (gọi /send, /auth/qr/*, /ui/*).
    | webhook_secret: HMAC header X-Zalo-Personal-Bridge-Secret (VerifyZaloBridgeSecret).
    | send_secret: X-Bridge-Send-Secret khi Laravel → bridge gửi tin.
    | ui_secret: X-Bridge-UI-Secret khi Laravel → bridge UI actions (QR, friends, ...).
    |
    */
    'zalo_bridge' => [
        'url' => env('ZALO_BRIDGE_URL', 'http://127.0.0.1:3710'),
        'webhook_secret' => env('ZALO_BRIDGE_WEBHOOK_SECRET', ''),
        'send_secret' => env('ZALO_BRIDGE_SEND_SECRET', ''),
        'ui_secret' => env('ZALO_BRIDGE_UI_SECRET', ''),
    ],

];
