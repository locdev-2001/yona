<?php

// Bản dịch tiếng Việt của lang/en/conversations.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

return [
    'activity' => [
        'status' => [
            'resolved' => 'Hội thoại được đánh dấu là đã giải quyết bởi {user_name}',
            'contact_resolved' => 'Hội thoại đã được giải quyết bởi {contact_name}',
            'open' => 'Hội thoại đã được mở lại bởi {user_name}',
            'pending' => 'Hội thoại được đánh dấu là chưa giải quyết bởi {user_name}',
            'snoozed' => 'Hội thoại đã được tạm dừng lại bởi {user_name}',
            'auto_resolved_days' => 'Hội thoại được đánh dấu là đã giải quyết bởi hệ thống vì {count} ngày không hoạt động',
            'auto_resolved_hours' => 'Hệ thống đánh dấu hội thoại là đã xử lý xong vì không có hoạt động nào trong {count} giờ',
            'auto_resolved_minutes' => 'Hệ thống đánh dấu hội thoại là đã xử lý xong vì không có hoạt động nào trong {count} phút',
            'system_auto_open' => 'Hệ thống mở lại hội thoại do có tin nhắn mới.',
        ],
        'priority' => [
            'added' => '{user_name} thiết lập độ ưu tiên thành {new_priority}',
            'updated' => '{user_name} thay đổi mức độ ưu tiên từ {old_priority} thành {new_priority}',
            'removed' => '{user_name} bỏ mức độ ưu tiên',
        ],
        'assignee' => [
            'self_assigned' => '{user_name} phân công chính mình vào hội thoại này',
            'assigned' => 'Chỉ định {assignee_name} bởi {user_name}',
            'removed' => 'Hội thoại chưa được chỉ định bởi {user_name}',
        ],
        'team' => [
            'assigned' => 'Chỉ định {team_name} bởi {user_name}',
            'assigned_with_assignee' => 'Phân công cho {assignee_name} thông qua {team_name} bởi {user_name}',
            'removed' => 'Huỷ phân công cho {team_name} bởi {user_name}',
        ],
        'labels' => [
            'added' => '{user_name} thêm {labels}',
            'removed' => '{user_name} xoá {labels}',
        ],
        'csat' => [
            'not_sent_due_to_messaging_window' => 'Chưa gửi được khảo sát CSAT do giới hạn gửi tin ra ngoài',
        ],
        'auto_resolve' => [
            'not_sent_due_to_messaging_window' => 'Chưa gửi được tin tự động xử lý xong do giới hạn gửi tin ra ngoài',
        ],
        'agent_bot' => [
            'error_moved_to_open' => 'Hệ thống đánh dấu hội thoại là đang mở do bot nhân viên gặp lỗi.',
        ],
        'muted' => '{user_name} đã tắt tiếng hội thoại',
        'unmuted' => '{user_name} đã bật tiếng hội thoại',
    ],
    'reply' => [
        'email' => [
            'header' => [
                'notifications' => 'Thông báo',
                'from_with_name' => '{assignee_name} từ {inbox_name} <{from_email}>',
                'reply_with_name' => '{assignee_name} từ {inbox_name} <reply+{reply_email}>',
                'friendly_name' => '{sender_name} từ {business_name} <{from_email}>',
                'professional_name' => '{business_name} <{from_email}>',
            ],
        ],
        'email_subject' => 'Tin nhắn mới về hội thoại này',
        'transcript_subject' => 'Bản ghi hội thoại',
    ],
    'templates' => [
        'ways_to_reach_you_message_body' => 'Trong lúc chờ đội ngũ hỗ trợ phản hồi, bạn hãy để lại email để nhận được thông báo nhanh nhất nhé.',
        'email_input_box_message_body' => 'Nhận thông báo qua email',
        'csat_input_message_body' => 'Bạn hãy vui lòng đánh giá hội thoại',
    ],

    // config/locales/vi.yml — conversations.messages.deleted.
    // Năm nhãn dưới là phần mở rộng của Yona cho các loại tin riêng của Zalo,
    // dùng lại đúng chữ Zalo hiện trong danh sách hội thoại.
    'messages' => [
        'deleted' => 'Tin nhắn đã bị xoá',
        'business_card' => '[Danh thiếp]',
        'bank_card' => '[Tài khoản ngân hàng]',
        'reminder' => '[Nhắc hẹn]',
        'call' => '[Cuộc gọi]',
        'friend_request' => '[Lời mời kết bạn]',
    ],
];
