<?php

// Bản dịch tiếng Việt của lang/en/chat_list.php.

return [
    'LOADING' => 'Đang tải các hội thoại',
    'LOAD_MORE_CONVERSATIONS' => 'Tải thêm các hội thoại',
    'EOF' => 'Tất cả các hội thoại đã được tải 🎉',
    'LIST' => [
        '404' => 'Không có bất kì hoạt động trò chuyện nào trong nhóm.',
        // Cột hội thoại rỗng phải nói rõ vì sao rỗng và chỉ sang tab đang có việc.
        'NONE_ASSIGNED_TO_ME' => 'Chưa có hội thoại nào được gán cho bạn.',
        'NONE_UNASSIGNED' => 'Mọi hội thoại đều đã có người phụ trách.',
        'VIEW_UNASSIGNED' => 'Xem {count} hội thoại chưa gán',
        'VIEW_ALL' => 'Xem tất cả {count} hội thoại',
    ],
    'FAILED_TO_SEND' => 'Gửi thất bại',
    'FETCH_ERROR' => 'Không tải được hội thoại. Bạn hãy thử lại.',
    'TAB_HEADING' => 'Các hội thoại',
    'MENTION_HEADING' => 'Nhắn đến',
    'UNATTENDED_HEADING' => 'Không giám sát',
    // Ô tìm trong cột danh sách chỉ lọc danh sách đang xem; tìm mọi thứ là ô ở sidebar.
    'SEARCH' => [
        'INPUT' => 'Tìm kiếm',
        'LABEL' => 'Tìm hội thoại trong danh sách đang xem',
        'CLEAR' => 'Xoá từ khoá',
        'COMPOSE' => 'Soạn tin nhắn mới',
        'NO_RESULTS' => 'Không có hội thoại nào khớp “{query}” trong danh sách đang xem.',
        'CONTACTS_HEADING' => 'Liên hệ',
        'CONVERSATIONS_HEADING' => 'Hội thoại',
    ],
    'FILTER_ALL' => 'Tất cả',
    // Nhãn tab phải ngắn để ba tab vừa bề rộng mặc định của cột hội thoại
    // (tiếng Việt dài hơn tiếng Anh) — xem reports/ux-deviations.md.
    'SELECTION_MODE' => [
        'START' => 'Chọn nhiều hội thoại',
        'EXIT' => 'Thoát chọn nhiều',
    ],
    'MORE_ACTIONS' => 'Thêm thao tác',
    // Bảng Lọc nhanh của cột danh sách (chip lọc ngay) và hàng chip đang bật dưới tab.
    'FILTER_PANEL' => [
        'BUTTON' => 'Lọc hội thoại',
        'BUTTON_ACTIVE' => 'Lọc hội thoại, {count} bộ lọc đang bật',
        'TITLE' => 'Lọc hội thoại',
        'ACTIVE' => 'Bộ lọc đang bật',
        'REMOVE' => 'Bỏ lọc {name}',
        'UNREAD' => '{count} hội thoại chưa đọc',
        'STATUS' => 'Trạng thái',
        'CHANNEL' => 'Kênh',
        'LABEL' => 'Nhãn',
        'SORT' => 'Sắp xếp',
        'ADVANCED' => 'Lọc nâng cao',
        'CLEAR' => 'Xoá lọc',
        'STATUS_ITEMS' => [
            'open' => 'Đang mở',
            'pending' => 'Chờ xử lý',
            'snoozed' => 'Báo lại',
            'resolved' => 'Đã giải quyết',
            'all' => 'Tất cả',
        ],
        'SORT_ITEMS' => [
            'last_activity_at_desc' => 'Mới nhất',
            'waiting_since_asc' => 'Chờ lâu nhất',
            'unread' => 'Chưa đọc nhiều',
        ],
    ],
    'ASSIGNEE_TYPE_TABS' => [
        'me' => 'Của tôi',
        'unassigned' => 'Chưa gán',
        'all' => 'Tất cả',
    ],
    'CHAT_STATUS_FILTER_ITEMS' => [
        'open' => [
            'TEXT' => 'Mở',
        ],
        'resolved' => [
            'TEXT' => 'Đã được giải quyết',
        ],
        'pending' => [
            'TEXT' => 'Chờ giải quyết',
        ],
        'snoozed' => [
            'TEXT' => 'Tạm dừng',
        ],
        'all' => [
            'TEXT' => 'Tất cả',
        ],
    ],
    'VIEW_FILTER' => 'Xem',
    'CHAT_TIME_STAMP' => [
        'CREATED' => [
            'LATEST' => 'Đã tạo',
            'OLDEST' => 'Tạo vào lúc:',
        ],
        'LAST_ACTIVITY' => [
            'NOT_ACTIVE' => 'Hoạt động cuối:',
            'ACTIVE' => 'Hoạt động cuối',
        ],
    ],
    'SORT_ORDER_ITEMS' => [
        'last_activity_at_asc' => [
            'TEXT' => 'Hoạt động cuối: cũ nhất trước',
        ],
        'last_activity_at_desc' => [
            'TEXT' => 'Hoạt động cuối: mới nhất trước',
        ],
        'created_at_desc' => [
            'TEXT' => 'Ngày tạo: mới nhất trước',
        ],
        'created_at_asc' => [
            'TEXT' => 'Ngày tạo: cũ nhất trước',
        ],
        'priority_desc' => [
            'TEXT' => 'Ưu tiên: cao nhất trước',
        ],
        'priority_asc' => [
            'TEXT' => 'Ưu tiên: thấp nhất trước',
        ],
        'waiting_since_asc' => [
            'TEXT' => 'Đang chờ trả lời: lâu nhất trước',
        ],
        'waiting_since_desc' => [
            'TEXT' => 'Đang chờ trả lời: ngắn nhất trước',
        ],
        'priority_desc_created_at_asc' => [
            'TEXT' => 'Ưu tiên: cao nhất trước, Ngày tạo: cũ nhất trước',
        ],
        'unread' => [
            'TEXT' => 'Số tin chưa đọc: nhiều nhất trước',
        ],
    ],
    'ATTACHMENTS' => [
        'image' => [
            'CONTENT' => 'Tin nhắn hình ảnh',
        ],
        'audio' => [
            'CONTENT' => 'Tin nhắn thoại',
        ],
        'video' => [
            'CONTENT' => 'Tin nhắn video',
        ],
        'file' => [
            'CONTENT' => 'Tập tin đính kèm',
        ],
        'location' => [
            'CONTENT' => 'Địa điểm',
        ],
        'ig_reel' => [
            'CONTENT' => 'Reel Instagram',
        ],
        'fallback' => [
            'CONTENT' => 'có một đường dẫn chia sẻ',
        ],
        'contact' => [
            'CONTENT' => 'Liên hệ được chia sẻ',
        ],
        'embed' => [
            'CONTENT' => 'Nội dung nhúng',
        ],
        'sticker' => [
            'CONTENT' => 'Sticker',
        ],
    ],
    'CHAT_SORT_BY_FILTER' => [
        'TITLE' => 'Sắp xếp hội thoại',
        'DROPDOWN_TITLE' => 'Sắp bởi',
        'ITEMS' => [
            'LATEST' => [
                'NAME' => 'Hoạt động cuối lúc',
                'LABEL' => 'Hoạt động cuối',
            ],
            'CREATED_AT' => [
                'NAME' => 'Tạo vào lúc',
                'LABEL' => 'Tạo vào lúc',
            ],
            'LAST_USER_MESSAGE_AT' => [
                'NAME' => 'Tin nhắn khách gửi cuối lúc',
                'LABEL' => 'Tin nhắn cuối',
            ],
        ],
    ],
    'RECEIVED_VIA_EMAIL' => 'Nhận được từ email',
    'VIEW_TWEET_IN_TWITTER' => 'Xem tweet trên Twitter',
    'REPLY_TO_TWEET' => 'Trả lời cho tweet này',
    'LINK_TO_STORY' => 'Đến xem lịch sử instagram',
    'SENT' => 'Gửi thành công',
    'READ' => 'Đọc thành công',
    'DELIVERED' => 'Đã gửi thành công',
    'NO_MESSAGES' => 'Không có tin nhắn',
    'SENDER_YOU' => 'Bạn',
    'NO_CONTENT' => 'Không có nội dung',
    // Mở rộng của Yona: nhãn thẻ hội thoại cho năng lực `friend_request`.
    'FRIEND_REQUEST' => '[Lời mời kết bạn]',
    'HIDE_QUOTED_TEXT' => 'Ẩn thư trích dẫn',
    'SHOW_QUOTED_TEXT' => 'Hiện thư trích dẫn',
    'MESSAGE_READ' => 'Đọc',
    'SENDING' => 'Đang gửi',
    'UNREAD_COUNT_OVERFLOW' => '9+',
];
