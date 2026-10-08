<?php

// Bản dịch tiếng Việt của lang/en/notifications.php.

return [
    'notification_title' => [
        'conversation_creation' => 'Một hội thoại (#{display_id}) vừa được tạo trong {inbox_name}',
        'conversation_assignment' => 'Một hội thoại (#{display_id}) vừa được giao cho bạn',
        'assigned_conversation_new_message' => 'Có tin nhắn mới trong hội thoại (#{display_id})',
        'conversation_mention' => 'Bạn được nhắc tên trong hội thoại (#{display_id})',
        'sla_missed_first_response' => 'Hội thoại (#{display_id}) đã trễ SLA phản hồi đầu tiên',
        'sla_missed_next_response' => 'Hội thoại (#{display_id}) đã trễ SLA phản hồi kế tiếp',
        'sla_missed_resolution' => 'Hội thoại (#{display_id}) đã trễ SLA xử lý xong',
    ],
    'attachment' => 'Tệp đính kèm',
    'no_content' => 'Không có nội dung',
    'email' => [
        'conversation_creation' => '{agent_name}, một hội thoại mới [ID - {display_id}] vừa được tạo trong {inbox_name}.',
        'conversation_assignment' => '{agent_name}, một hội thoại mới [ID - {display_id}] vừa được giao cho bạn.',
        'conversation_mention' => '{agent_name}, bạn được nhắc tên trong hội thoại [ID - {display_id}]',
        'assigned_conversation_new_message' => '{agent_name}, có tin nhắn mới trong hội thoại bạn phụ trách [ID - {display_id}].',
        'participating_conversation_new_message' => '{agent_name}, có tin nhắn mới trong hội thoại bạn tham gia [ID - {display_id}].',
    ],
    'account' => [
        'greeting' => 'Xin chào,',
        'contact_export_complete' => [
            'subject' => 'Tệp xuất danh sách liên hệ đã sẵn sàng',
            'body' => 'Tệp xuất danh sách liên hệ của bạn đã sẵn sàng.',
            'action' => 'Tải tệp xuất về',
        ],
        'contact_import_complete' => [
            'subject' => 'Đã nhập xong danh sách liên hệ',
            'body' => 'Danh sách liên hệ của bạn đã được nhập xong. Mở trang Liên hệ để xem các liên hệ vừa nhập.',
            'imported' => 'Số dòng đã nhập: {count}',
            'failed' => 'Số dòng lỗi: {count}',
            'action_view_contacts' => 'Xem liên hệ vừa nhập',
            'action_view_failed' => 'Xem các dòng lỗi',
        ],
        'contact_import_failed' => [
            'subject' => 'Nhập danh sách liên hệ thất bại',
            'body' => 'Không nhập được danh sách liên hệ. Tệp CSV bạn tải lên có thể không hợp lệ, vui lòng kiểm tra lại tệp và đảm bảo đúng định dạng yêu cầu.',
        ],
    ],
];
