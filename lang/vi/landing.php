<?php

// Chữ máy chủ cần cho bề mặt công khai: thẻ meta, JSON-LD, lỗi form và link về
// trang chủ ở màn đăng nhập. Lời giới thiệu hiển thị trên trang nằm ở
// resources/js/landing/copy.ts.
return [
    'meta' => [
        'title' => 'Yona · Hộp thư cá nhân cho Zalo, email và bạn bè',
        'description' => 'Gom tin nhắn Zalo cá nhân, Gmail và tin từ bạn bè trên Yona về một hộp thư của riêng bạn. Tìm nhau bằng @username, mở ngay trên trình duyệt, cài lên điện thoại.',
    ],

    'nav' => [
        'back_to_home' => 'Về trang chủ',
    ],

    // Route /dat-lich-demo còn để link cũ không thành trang lỗi; trang hiện nội dung trang chủ.
    'demo' => [
        'meta' => [
            'title' => 'Yona · Hộp thư cá nhân cho Zalo, email và bạn bè',
            'description' => 'Đăng ký Yona bằng email hoặc tài khoản Google là có ngay một hộp thư riêng: kết nối Zalo cá nhân và Gmail, nhắn với bạn bè bằng @username.',
        ],
        'form' => [
            'phone_invalid' => 'Số điện thoại chưa đúng. Nhập dạng 0912345678 hoặc +84912345678.',
        ],
        'thanks' => [
            'meta' => [
                'title' => 'Yona · Hộp thư cá nhân cho Zalo, email và bạn bè',
                'description' => 'Gom tin nhắn Zalo cá nhân, Gmail và tin từ bạn bè trên Yona về một hộp thư của riêng bạn.',
            ],
        ],
    ],

    // Route /zalo-ca-nhan còn để link cũ không thành trang lỗi; trang hiện nội dung trang chủ.
    'zalo_page' => [
        'meta' => [
            'title' => 'Đọc và trả lời Zalo cá nhân trong hộp thư Yona',
            'description' => 'Quét mã QR để đưa tin nhắn Zalo cá nhân về hộp thư Yona, đọc chung một chỗ với Gmail và tin từ bạn bè. Kết nối không chính thức nên tài khoản Zalo có thể bị hạn chế.',
        ],
        'hero' => [
            'eyebrow' => 'Zalo cá nhân',
        ],
    ],
];
