<?php

// Admin console overview page: draggable statistics widgets.

return [
    'WIDGETS' => [
        'KPIS' => ['TITLE' => 'Key metrics', 'DESCRIPTION' => 'Totals and change versus the previous period of equal length.'],
        'MESSAGES_TREND' => ['TITLE' => 'Messages by day', 'DESCRIPTION' => 'Incoming and outgoing messages per day.'],
        'CONVERSATIONS_BY_CHANNEL' => ['TITLE' => 'New conversations by channel', 'DESCRIPTION' => 'Conversations created in the range, by channel type.'],
        'CHANNEL_HEALTH' => ['TITLE' => 'Channel health', 'DESCRIPTION' => 'Channels that lost their session or need reauthorization.'],
        'OPERATION_LINKS' => ['TITLE' => 'Operations shortcuts', 'DESCRIPTION' => 'Jump to the system monitoring dashboards.'],
        'ACTIVATION_FUNNEL' => ['TITLE' => 'Activation funnel', 'DESCRIPTION' => 'How far accounts that signed up in the range got.'],
        'SIGNUPS_TREND' => ['TITLE' => 'Signups by day', 'DESCRIPTION' => 'Accounts created per day.'],
        'TOP_ACCOUNTS' => ['TITLE' => 'Most active accounts', 'DESCRIPTION' => 'Top 10 accounts by messages in the range.'],
        'RECENT_SIGNUPS' => ['TITLE' => 'Latest accounts', 'DESCRIPTION' => 'The 10 most recent signups.'],
        'QUEUE_HEALTH' => ['TITLE' => 'Queues', 'DESCRIPTION' => 'Pending jobs, failed jobs and worker processes.'],
        'STICKERS' => ['TITLE' => 'Sticker library', 'DESCRIPTION' => 'Shared library and per-account libraries.'],
        'SYSTEM' => ['TITLE' => 'System', 'DESCRIPTION' => 'Versions and database size.'],
    ],
    'METRICS' => [
        'ACCOUNTS_TOTAL' => 'Total accounts',
        'ACCOUNTS_NEW' => 'New accounts',
        'ACCOUNTS_ACTIVE' => 'Active accounts',
        'USERS_TOTAL' => 'Agents',
        'CONVERSATIONS_NEW' => 'New conversations',
        'MESSAGES_INCOMING' => 'Incoming messages',
        'MESSAGES_OUTGOING' => 'Outgoing messages',
        'INBOXES_TOTAL' => 'Inboxes',
    ],
    'FUNNEL_STEPS' => [
        'SIGNED_UP' => 'Signed up',
        'CREATED_INBOX' => 'Created inbox',
        'CONNECTED_CHANNEL' => 'Connected external channel',
        'RECEIVED_MESSAGE' => 'Received first message',
        'REPLIED' => 'Replied to first message',
    ],
];
