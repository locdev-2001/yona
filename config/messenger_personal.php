<?php

// Kênh Messenger cá nhân. Sidecar Go (services/messenger-bridge) là cửa duy nhất nói
// chuyện với Meta; Laravel chỉ gọi HTTP vào sidecar theo hợp đồng
// plans/261029-personal-messenger-channel/contract.md.
return [
    'bridge' => [
        'url' => env('MESSENGER_BRIDGE_URL', 'http://127.0.0.1:8614'),
        // Laravel → sidecar: /auth/*, /health, /media/* (X-Bridge-UI-Secret).
        'ui_secret' => env('MESSENGER_BRIDGE_UI_SECRET', ''),
        // Laravel → sidecar: /messages/*, /requests/* (X-Bridge-Send-Secret).
        'send_secret' => env('MESSENGER_BRIDGE_SEND_SECRET', ''),
        // Sidecar → Laravel: header X-Messenger-Bridge-Secret trên webhook.
        'webhook_secret' => env('MESSENGER_BRIDGE_WEBHOOK_SECRET', ''),
        'timeout' => 10,
        // Đăng nhập chờ Meta trả bước kế (2FA, duyệt thiết bị) nên lâu hơn mức thường.
        'login_timeout' => 60,
        'send_timeout' => 15,
        'media_timeout' => 120,
        'typing_timeout' => 3,
    ],

    // Trang mã nguồn sidecar (nghĩa vụ AGPL). Rỗng thì giao diện ẩn liên kết.
    'source_url' => env('MESSENGER_BRIDGE_SOURCE_URL') ?: 'https://github.com/locdev-2001/yona-messenger-bridge',

    // Ngắt mạch khi Meta từ chối liên tiếp hoặc mất phiên, cùng luật với Zalo cá nhân.
    'circuit_breaker' => [
        'threshold' => 5,
        'window_seconds' => 3600,
        'half_open_seconds' => 300,
    ],
];
