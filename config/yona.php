<?php

use App\Services\Stickers\NodeStickerRenderer;

return [

    /*
    |--------------------------------------------------------------------------
    | Phiên bản + console quản trị
    |--------------------------------------------------------------------------
    |
    | `version` hiện ở thanh điều hướng /super_admin và trang Instance Health.
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
    | Disk của tệp mượn
    |--------------------------------------------------------------------------
    |
    | Đính kèm trỏ vào tệp trên các disk này là tệp MƯỢN của một kho dùng chung:
    | xoá tin không xoá tệp, chuyển tiếp dùng lại cùng đường dẫn thay vì sao tệp.
    |
    */

    'attachment_borrowed_disks' => ['stickers'],

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
    | Phiên console quản trị
    |--------------------------------------------------------------------------
    |
    | Guard `super_admin` dùng chung cookie phiên với nhân viên (SESSION_LIFETIME
    | dài 30 ngày) nhưng tự hết hạn sau ngần ấy phút không thao tác trong vùng
    | /super_admin, /horizon, /pulse, /log-viewer.
    |
    */

    'super_admin_idle_minutes' => (int) env('SUPER_ADMIN_IDLE_MINUTES', 120),

    /*
    |--------------------------------------------------------------------------
    | Tài khoản có quyền hệ thống
    |--------------------------------------------------------------------------
    |
    | Email user (bảng users, không phải console Super Admin) cách nhau bằng dấu
    | phẩy. Chỉ App\Support\SystemAccess đọc giá trị này; so khớp bỏ khoảng
    | trắng, không phân biệt hoa thường. Để trống = không ai có quyền hệ thống.
    |
    */

    'system_admin_emails' => env('YONA_SYSTEM_ADMIN_EMAILS', ''),

    /*
    |--------------------------------------------------------------------------
    | Blocked email domains
    |--------------------------------------------------------------------------
    |
    | Tương đương BLOCKED_EMAIL_DOMAINS — mỗi dòng một pattern,
    | so khớp regex với domain email đăng ký.
    |
    */

    'blocked_email_domains' => env('BLOCKED_EMAIL_DOMAINS', ''),

    /*
    |--------------------------------------------------------------------------
    | Legal links
    |--------------------------------------------------------------------------
    |
    | Tương đương TERMS_URL / PRIVACY_URL trong installation config bản gốc —
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
    | dài hơn agent. Dashboard ping mỗi 20s: hạn của agent phải dài hơn chu kỳ
    | đó, nếu không giữa hai nhịp ping agent bị tính vắng mặt trong chốc lát.
    |
    */

    'presence_duration' => (int) env('PRESENCE_DURATION', 30),
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
    | WIDGET_TOKEN_EXPIRY (ngày). available_locales thay
    | LANGUAGES_CONFIG — widget dựng danh sách ngôn ngữ từ đây.
    |
    */

    'widget_token_expiry_days' => (int) env('WIDGET_TOKEN_EXPIRY', 180),

    // Sticker làm từ ảnh tải lên (PNG, JPG, WebP, GIF/WebP động). `renderer`
    // chọn một mục trong `renderers`; thêm trình dựng khác = thêm một mục, không
    // sửa pipeline. Trình dựng chạy trong tiến trình con bị cắt theo
    // `timeout_seconds` và bị giới hạn bộ nhớ dữ liệu ở tầng hệ điều hành bằng
    // `prlimit --data` (tính cả stack của các luồng libvips). macOS không có
    // prlimit: chạy local thì đặt STICKER_RENDERER_MEMORY_LIMITER=none.
    'stickers' => [
        'renderer' => env('STICKER_RENDERER', 'node'),
        'renderers' => [
            'node' => [
                'class' => NodeStickerRenderer::class,
                'binary' => env('STICKER_RENDERER_NODE_BINARY', 'node'),
                'script' => base_path('services/sticker-renderer/src/render.mjs'),
            ],
        ],
        // Cạnh (px) của tệp sticker vuông: WebP hiển thị trong Yona và PNG gửi kênh ngoài (Zalo...).
        'image_size' => (int) env('STICKER_IMAGE_SIZE', 64),
        // Cạnh (px CSS) khi hiện sticker ở hộp thư và widget; tách khỏi cạnh tệp để màn retina tăng riêng được.
        'display_size' => (int) env('STICKER_DISPLAY_SIZE', 64),
        // Trần dung lượng ảnh gốc tải lên. Trình dựng còn tự chặn ảnh trên 20 MB,
        // 25 triệu điểm ảnh mỗi khung, 200 khung hoặc hoạt ảnh dài quá 10 giây.
        'max_original_mb' => (int) env('STICKER_MAX_ORIGINAL_MB', 10),
        'timeout_seconds' => (int) env('STICKER_RENDERER_TIMEOUT', 10),
        'memory_limiter' => env('STICKER_RENDERER_MEMORY_LIMITER', 'prlimit'),
        'memory_limit_mb' => (int) env('STICKER_RENDERER_MEMORY_MB', 512),
    ],

    'available_locales' => [
        ['name' => 'English', 'iso_639_1_code' => 'en'],
        ['name' => 'Tiếng Việt', 'iso_639_1_code' => 'vi'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Số điện thoại
    |--------------------------------------------------------------------------
    |
    | App\Support\PhoneNumber hiểu số gõ không kèm `+` theo quốc gia mặc định.
    | Thêm quốc gia = thêm một dòng `countries`: mã nước, tiền tố gọi trong
    | nước, và các độ dài hợp lệ của số sau mã nước.
    |
    */

    'phone_numbers' => [
        'default_country' => env('PHONE_DEFAULT_COUNTRY', 'VN'),
        'countries' => [
            // Di động 9 số (912 345 678), cố định 10 số (28 3812 3456).
            'VN' => ['calling_code' => '84', 'trunk_prefix' => '0', 'national_number_lengths' => [9, 10]],
        ],
    ],

];
