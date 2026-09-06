<?php

// Bản dịch tiếng Việt của lang/en/notifications.php.
// Nguồn: bản dịch `vi` của Chatwoot v4.17.1 (dashboard/widget/survey + config/locales/vi.yml);
// khóa Chatwoot chưa dịch và khóa riêng Yona được dịch mới trong đợt G3.

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
];
