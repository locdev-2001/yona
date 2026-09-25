<?php

// Chuỗi activity message do backend sinh (nhánh status/priority/mute).

return [
    'activity' => [
        'status' => [
            'resolved' => 'Conversation was marked resolved by {user_name}',
            'contact_resolved' => 'Conversation was resolved by {contact_name}',
            'open' => 'Conversation was reopened by {user_name}',
            'pending' => 'Conversation was marked as pending by {user_name}',
            'snoozed' => 'Conversation was snoozed by {user_name}',
            'auto_resolved_days' => 'Conversation was marked resolved by system due to {count} days of inactivity',
            'auto_resolved_hours' => 'Conversation was marked resolved by system due to {count} hours of inactivity',
            'auto_resolved_minutes' => 'Conversation was marked resolved by system due to {count} minutes of inactivity',
            'system_auto_open' => 'System reopened the conversation due to a new incoming message.',
        ],
        'priority' => [
            'added' => '{user_name} set the priority to {new_priority}',
            'updated' => '{user_name} changed the priority from {old_priority} to {new_priority}',
            'removed' => '{user_name} removed the priority',
        ],
        'assignee' => [
            'self_assigned' => '{user_name} self-assigned this conversation',
            'assigned' => 'Assigned to {assignee_name} by {user_name}',
            'removed' => 'Conversation unassigned by {user_name}',
        ],
        'team' => [
            'assigned' => 'Assigned to {team_name} by {user_name}',
            'assigned_with_assignee' => 'Assigned to {assignee_name} via {team_name} by {user_name}',
            'removed' => 'Unassigned from {team_name} by {user_name}',
        ],
        'labels' => [
            'added' => '{user_name} added {labels}',
            'removed' => '{user_name} removed {labels}',
        ],
        'csat' => [
            'not_sent_due_to_messaging_window' => 'CSAT survey not sent due to outgoing message restrictions',
        ],
        'auto_resolve' => [
            'not_sent_due_to_messaging_window' => 'Auto-resolve message not sent due to outgoing message restrictions',
        ],
        'agent_bot' => [
            'error_moved_to_open' => 'Conversation was marked open by system due to an error with the agent bot.',
        ],
        'muted' => '{user_name} has muted the conversation',
        'unmuted' => '{user_name} has unmuted the conversation',
    ],

    // Nội dung tin mẫu do MessageTemplates sinh ra (email collect + CSAT).
    // F1: config/locales/en.yml khối conversations.reply — tiêu đề/tên người gửi
    // của thư trả lời gửi qua kênh Email.
    'reply' => [
        'email' => [
            'header' => [
                'notifications' => 'Notifications',
                'from_with_name' => '{assignee_name} from {inbox_name} <{from_email}>',
                'reply_with_name' => '{assignee_name} from {inbox_name} <reply+{reply_email}>',
                'friendly_name' => '{sender_name} from {business_name} <{from_email}>',
                'professional_name' => '{business_name} <{from_email}>',
            ],
        ],
        'email_subject' => 'New messages on this conversation',
        'transcript_subject' => 'Conversation Transcript',
    ],

    'templates' => [
        'ways_to_reach_you_message_body' => 'Give the team a way to reach you.',
        'email_input_box_message_body' => 'Get notified by email',
        'csat_input_message_body' => 'How was the support you received?',
    ],

    // config/locales/en.yml — conversations.messages.deleted (Message#deleted).
    // Sáu nhãn dưới là phần mở rộng của Yona: loại tin riêng của Zalo không có
    // content_type trong lõi nên `content` giữ nhãn đọc được để card hội thoại,
    // tìm kiếm và webhook không rỗng (chi tiết ở content_attributes).
    'messages' => [
        'deleted' => 'This message was deleted',
        'business_card' => '[Contact card]',
        'bank_card' => '[Bank account]',
        'reminder' => '[Reminder]',
        'call' => '[Call]',
        'link' => '[Link]',
        'friend_request' => '[Friend request]',
    ],
];
