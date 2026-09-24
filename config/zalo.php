<?php

// Kênh Zalo cá nhân (G1). Bridge Node (services/zalo-bridge, thư viện zca-js) là
// cửa duy nhất nói chuyện với Zalo — Laravel chỉ gọi HTTP vào bridge.
return [
    'bridge' => [
        'url' => env('ZALO_BRIDGE_URL', 'http://127.0.0.1:8612'),
        // Bridge → Laravel: header X-Zalo-Personal-Bridge-Secret.
        'webhook_secret' => env('ZALO_BRIDGE_WEBHOOK_SECRET', ''),
        // Laravel → bridge: gửi tin (X-Bridge-Send-Secret) và thao tác QR (X-Bridge-UI-Secret).
        'send_secret' => env('ZALO_BRIDGE_SEND_SECRET', ''),
        'ui_secret' => env('ZALO_BRIDGE_UI_SECRET', ''),
        'timeout' => 10,
        // Promote phải chờ bridge gọi REST Zalo lấy tên/avatar tài khoản: 10s là
        // quá ngắn, người dùng nhận "cầu nối chưa chạy" trong khi đã kết nối xong
        // (zalo-deep-audit 6.9).
        'promote_timeout' => 30,
        'media_timeout' => 120,
        // Liệt kê thành viên nhóm lần đầu (chưa có cache) phải chờ Zalo trả danh
        // sách theo lô 50 người — nhóm đông cần hơn mức 10s mặc định.
        'members_timeout' => 30,
    ],

    // Quyết định founder 07/09/2026: KHÔNG chặn tin chủ động nữa — cửa sổ giờ
    // 7h–22h và trần 3 tin/số/ngày đã gỡ khỏi đường gửi. Còn lại là bộ ĐẾM
    // (SendRateLimiter) để dựng chính sách gói cước sau; múi giờ chỉ quyết định
    // mốc cắt ngày của bộ đếm.
    'counter_timezone' => 'Asia/Ho_Chi_Minh',
    // Ranh giới coi một tin đi là "trả lời" (có tin khách trong bao lâu) — dùng
    // để phân loại thống kê tin chủ động, không dùng để chặn.
    'reply_window_hours' => 24,

    // Zalo Web chỉ phát MỘT sự kiện typing cho cả lượt gõ, và hàng đợi dev chạy
    // `--sleep=3` nên job tắt còn trễ thêm 1–4 giây. Để 5 giây thì bong bóng
    // "đang nhập…" chớp tắt giữa lúc khách vẫn đang gõ; 10 giây là mức chờ đủ
    // cho một câu dài mà vẫn tắt sớm hơn ngưỡng 30 giây của giao diện.
    'typing_off_delay' => 10,

    // Ngắt mạch khi Zalo thật sự từ chối (429/500 từ zca) hoặc mất phiên.
    // Lỗi cấu hình secret (403/503 của bridge) KHÔNG tính vào đây.
    'circuit_breaker' => [
        'threshold' => 5,
        'window_seconds' => 3600,
        // Mạch mở không được khoá vĩnh viễn: sau ngần này giây cho MỘT lượt thử
        // (half-open). Hỏng tiếp thì đóng lại, ngon thì mở hẳn.
        'half_open_seconds' => 300,
    ],
];
