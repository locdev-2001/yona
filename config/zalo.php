<?php

// Kênh Zalo cá nhân (G1). Bridge Node (services/zalo-bridge, thư viện zca-js) là
// cửa duy nhất nói chuyện với Zalo — Laravel chỉ gọi HTTP vào bridge.
return [
    'bridge' => [
        'url' => env('ZALO_BRIDGE_URL', 'http://127.0.0.1:3710'),
        // Bridge → Laravel: header X-Zalo-Personal-Bridge-Secret.
        'webhook_secret' => env('ZALO_BRIDGE_WEBHOOK_SECRET', ''),
        // Laravel → bridge: gửi tin (X-Bridge-Send-Secret) và thao tác QR (X-Bridge-UI-Secret).
        'send_secret' => env('ZALO_BRIDGE_SEND_SECRET', ''),
        'ui_secret' => env('ZALO_BRIDGE_UI_SECRET', ''),
        'timeout' => 10,
        'media_timeout' => 120,
    ],

    // Nghị định 91/2020 + ToS Zalo: chỉ áp cho tin CHỦ ĐỘNG, không áp tin trả lời
    // trong cửa sổ hội thoại (xem SendRateLimiter).
    'send_window' => [
        'timezone' => 'Asia/Ho_Chi_Minh',
        'open_hour' => 7,
        'close_hour' => 22,
    ],
    'daily_promotional_cap' => 3,
    'reply_window_hours' => 24,

    // Ngắt mạch khi bridge liên tục trả 429/403/session_lost.
    'circuit_breaker' => [
        'threshold' => 5,
        'window_seconds' => 3600,
    ],
];
