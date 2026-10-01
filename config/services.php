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

    // F2-F5 kênh ngoài — biến môi trường (GlobalConfigService) đặt ở đây.
    'facebook' => [
        'app_id' => env('FB_APP_ID'),
        'app_secret' => env('FB_APP_SECRET'),
        'verify_token' => env('FB_VERIFY_TOKEN'),
        'api_version' => env('FB_API_VERSION', 'v22.0'),
    ],

    'instagram' => [
        'app_secret' => env('INSTAGRAM_APP_SECRET'),
        'verify_token' => env('INSTAGRAM_VERIFY_TOKEN'),
        'ig_verify_token' => env('IG_VERIFY_TOKEN'),
        'api_version' => env('INSTAGRAM_API_VERSION', 'v22.0'),
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

    // Đăng nhập / đăng ký bằng Google cho người dùng. Thiếu client_id hoặc
    // client_secret thì nút Google không hiện và hai route OAuth trả 404.
    // `redirect` tương đối được ghép với host của request đang chạy.
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI') ?: '/app/auth/oauth/google/callback',
    ],

    // Kết nối hộp thư Gmail bằng OAuth (scope https://mail.google.com/) — tách khỏi
    // đăng nhập Yona ở trên. KHOÁ mặc định tới khi Google duyệt scope nhạy cảm:
    // `enabled` false thì thẻ "Đăng nhập Google" ở màn Thêm kênh tự ẩn.
    // Redirect URI cần khai ở Google Cloud: {APP_URL}/app/email/oauth/google/callback.
    'google_mail' => [
        'enabled' => (bool) env('GOOGLE_MAIL_OAUTH_ENABLED', false),
        'client_id' => env('GOOGLE_MAIL_CLIENT_ID') ?: env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_MAIL_CLIENT_SECRET') ?: env('GOOGLE_CLIENT_SECRET'),
    ],

    // Kết nối hộp thư Outlook/Microsoft 365 bằng OAuth (app đăng ký ở Azure / Entra ID).
    // Thiếu client id/secret thì thẻ "Đăng nhập Microsoft" tự ẩn.
    // Redirect URI cần khai ở Azure: {APP_URL}/app/email/oauth/microsoft/callback.
    'microsoft_mail' => [
        'client_id' => env('MICROSOFT_MAIL_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_MAIL_CLIENT_SECRET'),
        'tenant' => env('MICROSOFT_MAIL_TENANT', 'common'),
    ],

    // Analytics không cookie của chính Yona. Script và sự kiện đi qua đường dẫn
    // first-party `proxy_path` trên domain app (routes/api.php) để trình chặn quảng
    // cáo không chặn theo domain/mẫu URL của nhà cung cấp. `host` hoặc `script_path`
    // trống = tắt analytics (máy dev).
    // Cảnh báo vận hành (job lỗi, Horizon/Reverb/zalo-bridge chết) —
    // App\Support\Alerts\OpsAlerter. Thiếu bot token/chat id = rơi về ghi log,
    // không chặn ứng dụng chạy.
    'alert_telegram' => [
        'bot_token' => env('ALERT_TELEGRAM_BOT_TOKEN'),
        'chat_id' => env('ALERT_TELEGRAM_CHAT_ID'),
    ],

    'plausible' => [
        'host' => env('PLAUSIBLE_HOST'),
        'script_path' => env('PLAUSIBLE_SCRIPT_PATH'),
        'proxy_path' => env('PLAUSIBLE_PROXY_PATH') ?: '/yv',
        // Header chứa IP thật của khách khi app đứng sau CDN (CF-Connecting-IP với
        // Cloudflare); trống = IP kết nối tới app.
        'client_ip_header' => env('PLAUSIBLE_CLIENT_IP_HEADER'),
        'script_ttl' => (int) env('PLAUSIBLE_SCRIPT_TTL', 21600),
    ],

];
