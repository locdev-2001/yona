<?php

// Tiêu đề/nội dung xem trước do backend sinh cho thông báo và push.

return [
    'notification_title' => [
        'conversation_creation' => 'A conversation (#{display_id}) has been created in {inbox_name}',
        'conversation_assignment' => 'New conversation (#{display_id})',
        'assigned_conversation_new_message' => 'A new message is created in conversation (#{display_id})',
        'conversation_mention' => 'You have been mentioned in conversation (#{display_id})',
        'sla_missed_first_response' => 'SLA target first response missed for conversation (#{display_id})',
        'sla_missed_next_response' => 'SLA target next response missed for conversation (#{display_id})',
        'sla_missed_resolution' => 'SLA target resolution missed for conversation (#{display_id})',
        'friend_request' => '{name} sent you a friend request',
        'friend_request_accepted' => '{name} accepted your friend request',
    ],
    'friendship' => [
        'friend_request' => 'sent you a friend request',
        'friend_request_accepted' => 'accepted your friend request',
    ],
    'attachment' => 'Attachment',
    'no_content' => 'No content',
    'email' => [
        'conversation_creation' => '{agent_name}, A new conversation [ID - {display_id}] has been created in {inbox_name}.',
        'conversation_assignment' => '{agent_name}, a new conversation [ID - {display_id}] arrived in your inbox.',
        'conversation_mention' => '{agent_name}, You have been mentioned in conversation [ID - {display_id}]',
        'assigned_conversation_new_message' => '{agent_name}, new message in conversation [ID - {display_id}].',
        'participating_conversation_new_message' => '{agent_name}, New message in your participating conversation [ID - {display_id}].',
    ],
    'account' => [
        'greeting' => 'Hello,',
        'contact_export_complete' => [
            'subject' => 'Your contact export file is ready to download',
            'body' => 'Your contact export file is ready.',
            'action' => 'Download the export file',
        ],
        'contact_import_complete' => [
            'subject' => 'Contact import completed',
            'body' => 'Your contact import has been completed. Open the Contacts page to see the imported contacts.',
            'imported' => 'Records imported: {count}',
            'failed' => 'Records failed: {count}',
            'action_view_contacts' => 'View imported contacts',
            'action_view_failed' => 'View failed records',
        ],
        'contact_import_failed' => [
            'subject' => 'Contact import failed',
            'body' => 'Your contact import has failed. The CSV file you uploaded may not be valid. Please check the file and make sure it follows the required format.',
        ],
    ],
];
