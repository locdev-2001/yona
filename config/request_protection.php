<?php

use App\Http\RequestSigning\Subjects\DashboardSigningSubject;
use App\Http\RequestSigning\Subjects\WidgetSigningSubject;

// Chống lạm dụng API nhắn tin từ trình duyệt: ký + mã hoá request theo khoá phiên,
// và giới hạn nhịp. Không nhằm giấu nội dung khỏi máy chủ (docs/system-architecture.md §10).
return [

    'signing' => [
        // Tắt là rollback tức thì: middleware cho qua, endpoint cấp khoá trả `enabled: false`,
        // client gửi JSON thường. Không cần deploy lại mã.
        'enabled' => (bool) env('REQUEST_SIGNING_ENABLED', true),

        'key_ttl_seconds' => (int) env('REQUEST_SIGNING_KEY_TTL', 12 * 3600),

        // Upload lớn trên mạng chậm: máy chủ chỉ kiểm dấu thời gian khi đã nhận xong thân request.
        'max_clock_skew_seconds' => (int) env('REQUEST_SIGNING_MAX_SKEW', 300),

        'cache_store' => env('REQUEST_SIGNING_CACHE_STORE'),

        // Mỗi bề mặt tự biết "ai đang gọi"; thêm bề mặt = thêm một lớp ở đây.
        'subjects' => [
            'dashboard' => DashboardSigningSubject::class,
            'widget' => WidgetSigningSubject::class,
        ],
    ],

    // Số request mỗi phút theo người gọi (nhân viên/bot + account, hoặc khách widget),
    // KHÔNG theo IP. Đủ rộng cho nhân viên gõ nhanh, gửi liên tiếp nhiều ảnh.
    'throttle' => [
        'dashboard' => [
            'reads' => (int) env('THROTTLE_DASHBOARD_MESSAGE_READS', 600),
            'writes' => (int) env('THROTTLE_DASHBOARD_MESSAGE_WRITES', 180),
        ],
        // Application API (header api_access_token) đi chung route với dashboard.
        'application_api' => [
            'reads' => (int) env('THROTTLE_APPLICATION_API_MESSAGE_READS', 600),
            'writes' => (int) env('THROTTLE_APPLICATION_API_MESSAGE_WRITES', 300),
        ],
        'widget' => [
            'reads' => (int) env('THROTTLE_WIDGET_MESSAGE_READS', 240),
            'writes' => (int) env('THROTTLE_WIDGET_MESSAGE_WRITES', 60),
            // Trần chung cho một hộp thư website: chặn script dựng hàng loạt khách giả.
            'writes_per_inbox' => (int) env('THROTTLE_WIDGET_MESSAGE_WRITES_PER_INBOX', 600),
        ],
        'platform_api' => [
            'requests' => (int) env('THROTTLE_PLATFORM_API_REQUESTS', 600),
        ],
    ],
];
