<?php

// Nguồn: Chatwoot v4.17.1 config/locales/en.yml — khóa `notifications`
// (tiêu đề/nội dung xem trước do backend sinh cho thông báo và push).

return [
    'notification_title' => [
        'conversation_creation' => 'A conversation (#{display_id}) has been created in {inbox_name}',
        'conversation_assignment' => 'A conversation (#{display_id}) has been assigned to you',
        'assigned_conversation_new_message' => 'A new message is created in conversation (#{display_id})',
        'conversation_mention' => 'You have been mentioned in conversation (#{display_id})',
        'sla_missed_first_response' => 'SLA target first response missed for conversation (#{display_id})',
        'sla_missed_next_response' => 'SLA target next response missed for conversation (#{display_id})',
        'sla_missed_resolution' => 'SLA target resolution missed for conversation (#{display_id})',
    ],
    'attachment' => 'Attachment',
    'no_content' => 'No content',
    'email' => [
        'conversation_creation' => '{agent_name}, A new conversation [ID - {display_id}] has been created in {inbox_name}.',
        'conversation_assignment' => '{agent_name}, A new conversation [ID - {display_id}] has been assigned to you.',
        'conversation_mention' => '{agent_name}, You have been mentioned in conversation [ID - {display_id}]',
        'assigned_conversation_new_message' => '{agent_name}, New message in your assigned conversation [ID - {display_id}].',
        'participating_conversation_new_message' => '{agent_name}, New message in your participating conversation [ID - {display_id}].',
    ],
];
