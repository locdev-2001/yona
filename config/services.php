<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // F2-F5 kênh ngoài — biến môi trường của Chatwoot (GlobalConfigService) đặt ở đây.
    'facebook' => [
        'app_id' => env('FB_APP_ID'),
        'app_secret' => env('FB_APP_SECRET'),
        'verify_token' => env('FB_VERIFY_TOKEN'),
        'api_version' => env('FB_API_VERSION', 'v22.0'),
        'human_agent_tag' => env('ENABLE_MESSENGER_CHANNEL_HUMAN_AGENT', false),
    ],

    'instagram' => [
        'app_secret' => env('INSTAGRAM_APP_SECRET'),
        'verify_token' => env('INSTAGRAM_VERIFY_TOKEN'),
        'ig_verify_token' => env('IG_VERIFY_TOKEN'),
        'api_version' => env('INSTAGRAM_API_VERSION', 'v22.0'),
        'human_agent_tag' => env('ENABLE_INSTAGRAM_CHANNEL_HUMAN_AGENT', false),
    ],

    'whatsapp_cloud' => [
        'base_url' => env('WHATSAPP_CLOUD_BASE_URL', 'https://graph.facebook.com'),
        'app_secret' => env('WHATSAPP_APP_SECRET'),
    ],

    'tiktok' => [
        'app_secret' => env('TIKTOK_APP_SECRET'),
        'api_version' => env('TIKTOK_API_VERSION', 'v1.3'),
    ],

    'twitter' => [
        'consumer_key' => env('TWITTER_CONSUMER_KEY'),
        'consumer_secret' => env('TWITTER_CONSUMER_SECRET'),
        'environment' => env('TWITTER_ENVIRONMENT', ''),
    ],

];
