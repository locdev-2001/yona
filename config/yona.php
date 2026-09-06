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
    | Phiên bản + console quản trị
    |--------------------------------------------------------------------------
    |
    | `version` hiện ở thanh điều hướng /super_admin và trang Instance Health
    | (Chatwoot.config[:version] của bản gốc). `account_seeding_enabled` tương
    | ứng ENABLE_ACCOUNT_SEEDING — mặc định tắt vì job sinh dữ liệu mẫu chưa port.
    |
    */

    'version' => env('YONA_VERSION', '4.17.1'),

    'account_seeding_enabled' => (bool) env('ENABLE_ACCOUNT_SEEDING', false),

    /*
    |--------------------------------------------------------------------------
    | Tệp đính kèm
    |--------------------------------------------------------------------------
    |
    | `download_url_ttl`: tuổi thọ (giây) của URL đính kèm ĐÃ KÝ gửi cho dịch vụ
    | bên ngoài (Zalo bridge, Meta, Twilio…) — tương đương
    | ActiveStorage::Service.url_expires_in của bản gốc, mặc định 5 phút. URL hiển
    | thị trong app vẫn ký nhưng không hết hạn, như `blobs/redirect` của gốc.
    |
    */

    'attachments' => [
        'download_url_ttl' => (int) env('ATTACHMENT_DOWNLOAD_URL_TTL', 300),
    ],

    /*
    |--------------------------------------------------------------------------
    | Xác thực hai lớp (MFA/2FA)
    |--------------------------------------------------------------------------
    |
    | Chatwoot bật MFA khi cấu hình đủ khoá mã hoá ActiveRecord; Laravel luôn có
    | APP_KEY nên tính năng sẵn sàng mặc định, cờ này chỉ để tắt khi cần.
    | MAX_USER_SESSIONS: số phiên đăng nhập song song tối đa của một user —
    | chạm trần thì màn đăng nhập bắt chọn phiên để thu hồi.
    |
    */

    'mfa_enabled' => (bool) env('MFA_ENABLED', true),

    'max_user_sessions' => (int) env('MAX_USER_SESSIONS', 25),

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

    /*
    |--------------------------------------------------------------------------
    | Branding
    |--------------------------------------------------------------------------
    |
    | Tương đương khối branding của installation_config.yml (INSTALLATION_NAME,
    | BRAND_NAME, LOGO_THUMBNAIL, WIDGET_BRAND_URL) — widget đọc qua
    | `global_config` trong phản hồi /api/v1/widget/config.
    |
    */

    'branding' => [
        'installation_name' => env('INSTALLATION_NAME', 'Yona'),
        'brand_name' => env('BRAND_NAME', 'Yona'),
        'logo_thumbnail' => env('LOGO_THUMBNAIL', '/brand-assets/logo.svg'),
        'widget_brand_url' => env('WIDGET_BRAND_URL', 'https://yona.vn'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Widget
    |--------------------------------------------------------------------------
    |
    | WIDGET_TOKEN_EXPIRY của Chatwoot (ngày). available_locales thay
    | LANGUAGES_CONFIG — widget dựng danh sách ngôn ngữ từ đây.
    |
    */

    'widget_token_expiry_days' => (int) env('WIDGET_TOKEN_EXPIRY', 180),

    'available_locales' => [
        ['name' => 'English', 'iso_639_1_code' => 'en'],
        ['name' => 'Tiếng Việt', 'iso_639_1_code' => 'vi'],
    ],

];
