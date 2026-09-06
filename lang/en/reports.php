<?php

// Port từ config/locales/en.yml khối `reports:` — nhãn cột của các file CSV tải về.
return [
    'period' => 'Reporting period :since to :until',
    'utc_warning' => 'The report generated is in UTC timezone',
    'agent_csv' => [
        'agent_name' => 'Agent name',
        'conversations_count' => 'Assigned conversations',
        'avg_first_response_time' => 'Avg first response time',
        'avg_resolution_time' => 'Avg resolution time',
        'resolution_count' => 'Resolution Count',
        'avg_customer_waiting_time' => 'Avg customer waiting time',
    ],
    'inbox_csv' => [
        'inbox_name' => 'Inbox name',
        'inbox_type' => 'Inbox type',
        'conversations_count' => 'No. of conversations',
        'avg_first_response_time' => 'Avg first response time',
        'avg_resolution_time' => 'Avg resolution time',
    ],
    'label_csv' => [
        'label_title' => 'Label',
        'conversations_count' => 'No. of conversations',
        'avg_first_response_time' => 'Avg first response time',
        'avg_resolution_time' => 'Avg resolution time',
        'avg_reply_time' => 'Avg reply time',
        'resolution_count' => 'Resolution Count',
    ],
    'team_csv' => [
        'team_name' => 'Team name',
        'conversations_count' => 'Conversations count',
        'avg_first_response_time' => 'Avg first response time',
        'avg_resolution_time' => 'Avg resolution time',
        'resolution_count' => 'Resolution Count',
        'avg_customer_waiting_time' => 'Avg customer waiting time',
    ],
    'conversation_csv' => [
        'conversations_count' => 'Conversations',
        'incoming_messages_count' => 'Messages received',
        'outgoing_messages_count' => 'Messages sent',
        'avg_first_response_time' => 'Avg first response time',
        'avg_resolution_time' => 'Avg resolution time',
        'resolution_count' => 'Resolution count',
        'avg_customer_waiting_time' => 'Avg customer waiting time',
    ],
    'conversation_traffic_csv' => [
        'timezone' => 'Timezone',
    ],
    'default_group_by' => 'day',
    'csat' => [
        'headers' => [
            'contact_name' => 'Contact Name',
            'contact_email_address' => 'Contact Email Address',
            'contact_phone_number' => 'Contact Phone Number',
            'link_to_the_conversation' => 'Link to the conversation',
            'agent_name' => 'Agent Name',
            'rating' => 'Rating',
            'feedback' => 'Feedback Comment',
            'recorded_at' => 'Recorded date',
        ],
    ],
];
