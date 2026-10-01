<?php

// Trang Tổng quan của console quản trị: ô thống kê kéo thả.

return [
    'WIDGETS' => [
        'KPIS' => ['TITLE' => 'Chỉ số chính', 'DESCRIPTION' => 'Số tổng và chênh lệch so với kỳ trước cùng độ dài.'],
        'MESSAGES_TREND' => ['TITLE' => 'Tin nhắn theo ngày', 'DESCRIPTION' => 'Tin khách gửi vào và tin trả lời ra mỗi ngày.'],
        'CONVERSATIONS_BY_CHANNEL' => ['TITLE' => 'Hội thoại mới theo kênh', 'DESCRIPTION' => 'Hội thoại tạo trong khoảng, chia theo loại kênh.'],
        'CHANNEL_HEALTH' => ['TITLE' => 'Sức khoẻ kênh', 'DESCRIPTION' => 'Kênh mất phiên hoặc cần cấp quyền lại.'],
        'OPERATION_LINKS' => ['TITLE' => 'Lối tắt vận hành', 'DESCRIPTION' => 'Mở nhanh các bảng theo dõi hệ thống.'],
        'ACTIVATION_FUNNEL' => ['TITLE' => 'Phễu kích hoạt', 'DESCRIPTION' => 'Account đăng ký trong khoảng đi được tới bước nào.'],
        'SIGNUPS_TREND' => ['TITLE' => 'Đăng ký mới theo ngày', 'DESCRIPTION' => 'Số account tạo mỗi ngày.'],
        'TOP_ACCOUNTS' => ['TITLE' => 'Account nhắn nhiều nhất', 'DESCRIPTION' => '10 account có nhiều tin nhất trong khoảng.'],
        'RECENT_SIGNUPS' => ['TITLE' => 'Account mới nhất', 'DESCRIPTION' => '10 account vừa đăng ký.'],
        'QUEUE_HEALTH' => ['TITLE' => 'Hàng đợi', 'DESCRIPTION' => 'Job đang chờ, job lỗi và tiến trình xử lý.'],
        'STICKERS' => ['TITLE' => 'Kho sticker', 'DESCRIPTION' => 'Kho chung và kho riêng của các account.'],
        'SYSTEM' => ['TITLE' => 'Hệ thống', 'DESCRIPTION' => 'Phiên bản và dung lượng cơ sở dữ liệu.'],
    ],
    'METRICS' => [
        'ACCOUNTS_TOTAL' => 'Tổng account',
        'ACCOUNTS_NEW' => 'Account mới',
        'ACCOUNTS_ACTIVE' => 'Account hoạt động',
        'USERS_TOTAL' => 'Nhân viên',
        'CONVERSATIONS_NEW' => 'Hội thoại mới',
        'MESSAGES_INCOMING' => 'Tin vào',
        'MESSAGES_OUTGOING' => 'Tin ra',
        'INBOXES_TOTAL' => 'Hộp thư',
    ],
    'FUNNEL_STEPS' => [
        'SIGNED_UP' => 'Đăng ký',
        'CREATED_INBOX' => 'Tạo hộp thư',
        'CONNECTED_CHANNEL' => 'Kết nối kênh ngoài',
        'RECEIVED_MESSAGE' => 'Nhận tin đầu tiên',
        'REPLIED' => 'Trả lời tin đầu tiên',
    ],
];
