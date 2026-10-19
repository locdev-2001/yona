<?php

// Nhắn tin giữa người dùng: lỗi trả về, nhãn hộp tin chờ, chặn, báo cáo vi phạm.

return [
    'COMPOSER' => [
        'PLACEHOLDER' => 'Nhập tin nhắn…',
    ],
    'TABS' => [
        'ALL' => 'Tất cả',
        'REQUESTS' => 'Tin chờ',
    ],
    'NEW' => [
        'TITLE' => 'Nhắn tin mới',
        'DESCRIPTION' => 'Tìm bạn bè theo @username hoặc tên.',
        'HINT' => 'Gõ ít nhất 2 ký tự để tìm.',
    ],
    'EMPTY' => [
        'ALL' => 'Chưa có cuộc trò chuyện nào. Bấm nút bút để nhắn tin mới.',
        'REQUESTS' => 'Không có tin chờ nào.',
        'START' => 'Chọn một cuộc trò chuyện hoặc bắt đầu nhắn tin mới',
    ],
    'REQUEST' => [
        'TITLE' => '{name} muốn nhắn tin với bạn',
        'BODY' => 'Người này chưa biết bạn đã xem tin cho tới khi bạn chấp nhận.',
        'ACCEPT' => 'Chấp nhận',
        'DELETE' => 'Xoá',
        'BLOCK' => 'Chặn',
    ],
    'ACTIONS' => [
        'BLOCK' => 'Chặn',
        'UNBLOCK' => 'Bỏ chặn',
        'REPORT' => 'Báo cáo',
        'DELETE' => 'Xoá cuộc trò chuyện',
    ],
    'BLOCK' => [
        'BLOCKED' => 'Đã chặn người này',
        'UNBLOCKED' => 'Đã bỏ chặn',
        'BANNER_BLOCKED_BY_ME' => 'Bạn đã chặn người này. Bỏ chặn ở menu ⋮ để nhắn tin lại.',
        'BANNER_CANNOT_REPLY' => 'Bạn không thể gửi tin trong cuộc trò chuyện này.',
        'COMPOSER_LOCKED' => 'Không gửi được tin trong cuộc trò chuyện này',
    ],
    'REPORT' => [
        'TITLE' => 'Báo cáo {name}',
        'DESCRIPTION' => 'Đội ngũ Yona sẽ xem xét. Người bị báo cáo không biết ai đã báo cáo.',
        'REASON' => 'Lý do',
        'REASONS' => [
            'SPAM' => 'Tin rác, quảng cáo',
            'HARASSMENT' => 'Quấy rối, đe doạ',
            'INAPPROPRIATE' => 'Nội dung không phù hợp',
            'SCAM' => 'Lừa đảo',
            'OTHER' => 'Lý do khác',
        ],
        'NOTE_PLACEHOLDER' => 'Thêm chi tiết (không bắt buộc)',
        'SUBMIT' => 'Gửi báo cáo',
        'SENT' => 'Đã gửi báo cáo',
    ],
    'DELETE' => [
        'TITLE' => 'Xoá cuộc trò chuyện?',
        'DESCRIPTION' => 'Cuộc trò chuyện biến khỏi danh sách của bạn. Người kia vẫn giữ và không được báo.',
        'CONFIRM' => 'Xoá',
    ],
    'PREVIEW' => [
        'RECALLED' => 'Tin nhắn đã được thu hồi',
        'STICKER' => 'Đã gửi một nhãn dán',
        'BANK_TRANSFER' => 'Đã gửi thông tin chuyển khoản',
    ],
    'ERRORS' => [
        'BLOCKED' => 'Không gửi được tin vì một trong hai người đã chặn người kia',
        'NOT_MEMBER' => 'Bạn không còn ở trong cuộc trò chuyện này',
        'SELF' => 'Bạn không thể nhắn cho chính mình',
        'EMPTY' => 'Tin nhắn đang trống',
    ],
];
