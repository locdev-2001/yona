<?php

return [
    // Kênh nội bộ — ĐẾ của module chat, không có cờ bật/tắt. Tắt nó là làm chat
    // chết, đúng thứ kiến trúc này tồn tại để loại bỏ.
    'widget' => [
        'inbound_secret' => env('WIDGET_CHANNEL_INBOUND_SECRET'),
    ],

    // Phích cắm bên ngoài — tắt được, tắt xong chat vẫn chạy.
    'zalo_personal' => ['enabled' => env('INTEGRATION_ZALO_PERSONAL', true)],
    'payment_manual' => ['enabled' => env('INTEGRATION_PAYMENT_MANUAL', true)],
];
