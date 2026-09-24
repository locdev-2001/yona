<?php

// Thông báo đẩy trình duyệt (Web Push + VAPID).
//
// Cặp khoá VAPID: đặt cả hai biến env thì dùng đúng cặp đó; để trống thì máy chủ
// tự sinh MỘT lần và lưu vào installation_configs (VAPID_KEYS), như VapidService
// — deploy + migrate là chạy, không cần cấu hình tay. Đổi cặp khoá
// làm mọi trình duyệt đã đăng ký phải bật lại thông báo.
return [
    'vapid' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    // ssl/open/read_timeout 5 giây của bản gốc.
    'timeout' => 5,
];
