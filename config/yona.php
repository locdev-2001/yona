<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Phiên bản + console quản trị
    |--------------------------------------------------------------------------
    |
    | `version` hiện ở thanh điều hướng /super_admin và trang Instance Health
    | (Chatwoot.config[:version] của bản gốc).
    |
    */

    'version' => env('YONA_VERSION', '4.17.1'),

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
    | MAX_USER_SESSIONS: số phiên đăng nhập song song tối đa của một user —
    | chạm trần thì màn đăng nhập bắt chọn phiên để thu hồi.
    |
    */

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
    | hiện dưới nút đăng ký và ở footer bề mặt công khai. Mặc định trỏ vào hai
    | trang pháp lý của chính bản cài đặt này; `/terms` và `/privacy-policy` cũ
    | chuyển hướng 301 về đây nên link đã phát ra ngoài vẫn sống.
    |
    */

    'terms_url' => env('TERMS_URL', rtrim((string) env('APP_URL', 'http://localhost'), '/').'/dieu-khoan'),
    'privacy_url' => env('PRIVACY_URL', rtrim((string) env('APP_URL', 'http://localhost'), '/').'/chinh-sach-rieng-tu'),

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
        'logo' => env('LOGO', '/brand-assets/logo.png'),
        // Bản logo cho nền tối — cùng tên tệp với bản gốc (public/brand-assets/logo_dark.png).
        'logo_dark' => env('LOGO_DARK', '/brand-assets/logo_dark.png'),
        'logo_thumbnail' => env('LOGO_THUMBNAIL', '/brand-assets/logo_thumbnail.png'),
        // Màu nền của icon ứng dụng — thanh địa chỉ trình duyệt di động và
        // splash screen khi cài về màn hình chính dùng màu này.
        'theme_color' => env('THEME_COLOR', '#041738'),
        'widget_brand_url' => env('WIDGET_BRAND_URL', 'https://yona.vn'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Bề mặt bán hàng
    |--------------------------------------------------------------------------
    |
    | Trang đặt lịch demo cần một chỗ để lead rơi vào. `lead_inbox_id` là hộp
    | thư kênh API của chính Yona: lead thành một hội thoại đến, nằm cùng chỗ
    | với tin khách — vừa không mất lead vừa là bằng chứng sản phẩm tự dùng được.
    |
    | Hotline và link Zalo để RỖNG khi chưa có số thật. Trang ẩn khối đó thay vì
    | bày một số không ai bắt máy.
    |
    */
    'marketing' => [
        'lead_inbox_id' => env('YONA_LEAD_INBOX_ID') ? (int) env('YONA_LEAD_INBOX_ID') : null,
        'hotline' => env('YONA_HOTLINE'),
        'zalo_url' => env('YONA_ZALO_CONTACT_URL'),
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
