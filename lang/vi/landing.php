<?php

// Chữ máy chủ cần cho bề mặt công khai: thẻ meta, JSON-LD, lỗi form và link về
// trang chủ ở màn đăng nhập. Lời giới thiệu hiển thị trên trang nằm ở
// resources/js/landing/copy.ts.
$homeMeta = [
    'title' => 'Yona — Nền tảng hợp nhất giao tiếp',
    'description' => 'Kết nối các nền tảng giao tiếp trong một không gian thống nhất với Yona. Đọc, trả lời và tìm lại các cuộc trò chuyện ở một nơi.',
];

return [
    'meta' => [
        'title' => $homeMeta['title'],
        'description' => $homeMeta['description'],
    ],

    'nav' => [
        'back_to_home' => 'Về trang chủ',
    ],

    // Route /dat-lich-demo còn để link cũ không thành trang lỗi; trang hiện nội dung trang chủ.
    'demo' => [
        'meta' => [
            'title' => $homeMeta['title'],
            'description' => $homeMeta['description'],
        ],
        'form' => [
            'phone_invalid' => 'Số điện thoại chưa đúng. Nhập dạng 0912345678 hoặc +84912345678.',
        ],
        'thanks' => [
            'meta' => [
                'title' => $homeMeta['title'],
                'description' => $homeMeta['description'],
            ],
        ],
    ],

    // Route /zalo-ca-nhan còn để link cũ không thành trang lỗi; trang hiện nội dung trang chủ.
    'zalo_page' => [
        'meta' => [
            'title' => $homeMeta['title'],
            'description' => $homeMeta['description'],
        ],
        'hero' => [
            'eyebrow' => 'Zalo cá nhân',
        ],
    ],
];
