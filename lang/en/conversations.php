<?php

// Nguồn: Chatwoot v4.17.1 config/locales/en.yml — khóa conversations.activity
// (chuỗi activity message do backend sinh). Chỉ nhánh status/priority/mute;
// label (B7), SLA (EE), automation (D1) port sau.

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
        'muted' => '{user_name} has muted the conversation',
        'unmuted' => '{user_name} has unmuted the conversation',
    ],
];
