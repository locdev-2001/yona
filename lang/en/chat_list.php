<?php

return [
    'LOADING' => 'Fetching conversations',
    'LOAD_MORE_CONVERSATIONS' => 'Load more conversations',
    'EOF' => 'All conversations loaded 🎉',
    'LIST' => [
        404 => 'There are no active conversations in this group.',
        // Yona: empty list explains WHY it is empty and points at the tab that has work.
        'NONE_ASSIGNED_TO_ME' => 'No conversation is assigned to you.',
        'NONE_UNASSIGNED' => 'Every conversation already has an assignee.',
        'VIEW_UNASSIGNED' => 'View {count} unassigned',
        'VIEW_ALL' => 'View all {count} conversations',
    ],
    'FAILED_TO_SEND' => 'Failed to send',
    'FETCH_ERROR' => 'Couldn\'t load conversations. Please try again.',
    'TAB_HEADING' => 'Conversations',
    'MENTION_HEADING' => 'Mentions',
    'UNATTENDED_HEADING' => 'Unattended',
    // Yona: the list search box only narrows the list in view; the sidebar box searches everything.
    'SEARCH' => [
        'INPUT' => 'Search',
        'LABEL' => 'Search conversations in this list',
        'CLEAR' => 'Clear search',
        'COMPOSE' => 'New message',
        'NO_RESULTS' => 'No conversation in this list matches “{query}”.',
        'CONTACTS_HEADING' => 'Contacts',
        'CONVERSATIONS_HEADING' => 'Conversations',
    ],
    'FILTER_ALL' => 'All',
    'SELECTION_MODE' => [
        'START' => 'Select conversations',
        'EXIT' => 'Exit selection',
    ],
    'MORE_ACTIONS' => 'More actions',
    // Quick filter panel of the list column (chips apply at once) and the active-filter chip row under the tabs.
    'FILTER_PANEL' => [
        'BUTTON' => 'Filter conversations',
        'BUTTON_ACTIVE' => 'Filter conversations, {count} filters on',
        'TITLE' => 'Filter conversations',
        'ACTIVE' => 'Active filters',
        'REMOVE' => 'Remove filter {name}',
        'UNREAD' => '{count} unread conversations',
        'STATUS' => 'Status',
        'CHANNEL' => 'Channel',
        'LABEL' => 'Label',
        'SORT' => 'Sort',
        'ADVANCED' => 'Advanced filters',
        'CLEAR' => 'Clear filters',
        'STATUS_ITEMS' => [
            'open' => 'Open',
            'pending' => 'Pending',
            'snoozed' => 'Snoozed',
            'resolved' => 'Resolved',
            'all' => 'All',
        ],
        'SORT_ITEMS' => [
            'last_activity_at_desc' => 'Newest',
            'waiting_since_asc' => 'Waiting longest',
            'unread' => 'Most unread',
        ],
    ],
    'ASSIGNEE_TYPE_TABS' => [
        'me' => 'Mine',
        'unassigned' => 'Unassigned',
        'all' => 'All',
    ],
    'CHAT_STATUS_FILTER_ITEMS' => [
        'open' => [
            'TEXT' => 'Open',
        ],
        'resolved' => [
            'TEXT' => 'Resolved',
        ],
        'pending' => [
            'TEXT' => 'Pending',
        ],
        'snoozed' => [
            'TEXT' => 'Snoozed',
        ],
        'all' => [
            'TEXT' => 'All',
        ],
    ],
    'VIEW_FILTER' => 'View',
    'CHAT_TIME_STAMP' => [
        'CREATED' => [
            'LATEST' => 'Created',
            'OLDEST' => 'Created at:',
        ],
        'LAST_ACTIVITY' => [
            'NOT_ACTIVE' => 'Last activity:',
            'ACTIVE' => 'Last activity',
        ],
    ],
    'SORT_ORDER_ITEMS' => [
        'last_activity_at_asc' => [
            'TEXT' => 'Last activity: Oldest first',
        ],
        'last_activity_at_desc' => [
            'TEXT' => 'Last activity: Newest first',
        ],
        'created_at_desc' => [
            'TEXT' => 'Created at: Newest first',
        ],
        'created_at_asc' => [
            'TEXT' => 'Created at: Oldest first',
        ],
        'priority_desc' => [
            'TEXT' => 'Priority: Highest first',
        ],
        'priority_asc' => [
            'TEXT' => 'Priority: Lowest first',
        ],
        'waiting_since_asc' => [
            'TEXT' => 'Pending Response: Longest first',
        ],
        'waiting_since_desc' => [
            'TEXT' => 'Pending Response: Shortest first',
        ],
        'priority_desc_created_at_asc' => [
            'TEXT' => 'Priority: Highest first, Created: Oldest first',
        ],
        'unread' => [
            'TEXT' => 'Unread Count: Highest first',
        ],
    ],
    'ATTACHMENTS' => [
        'image' => [
            'CONTENT' => 'Picture message',
        ],
        'audio' => [
            'CONTENT' => 'Audio message',
        ],
        'video' => [
            'CONTENT' => 'Video message',
        ],
        'file' => [
            'CONTENT' => 'File Attachment',
        ],
        'location' => [
            'CONTENT' => 'Location',
        ],
        'ig_reel' => [
            'CONTENT' => 'Instagram Reel',
        ],
        'fallback' => [
            'CONTENT' => 'has shared a url',
        ],
        'contact' => [
            'CONTENT' => 'Shared contact',
        ],
        'embed' => [
            'CONTENT' => 'Embedded content',
        ],
        'sticker' => [
            'CONTENT' => 'Sticker',
        ],
    ],
    'CHAT_SORT_BY_FILTER' => [
        'TITLE' => 'Sort conversation',
        'DROPDOWN_TITLE' => 'Sort by',
        'ITEMS' => [
            'LATEST' => [
                'NAME' => 'Last activity at',
                'LABEL' => 'Last activity',
            ],
            'CREATED_AT' => [
                'NAME' => 'Created at',
                'LABEL' => 'Created at',
            ],
            'LAST_USER_MESSAGE_AT' => [
                'NAME' => 'Last user message at',
                'LABEL' => 'Last message',
            ],
        ],
    ],
    'RECEIVED_VIA_EMAIL' => 'Received via email',
    'VIEW_TWEET_IN_TWITTER' => 'View tweet in Twitter',
    'REPLY_TO_TWEET' => 'Reply to this tweet',
    'LINK_TO_STORY' => 'Go to instagram story',
    'SENT' => 'Sent successfully',
    'READ' => 'Read successfully',
    'DELIVERED' => 'Delivered successfully',
    'NO_MESSAGES' => 'No Messages',
    'SENDER_YOU' => 'You',
    'NO_CONTENT' => 'No content available',
    // Mở rộng của Yona: nhãn thẻ hội thoại cho năng lực `friend_request`.
    'FRIEND_REQUEST' => '[Friend request]',
    'HIDE_QUOTED_TEXT' => 'Hide Quoted Text',
    'SHOW_QUOTED_TEXT' => 'Show Quoted Text',
    'MESSAGE_READ' => 'Read',
    'SENDING' => 'Sending',
    'UNREAD_COUNT_OVERFLOW' => '9+',
];
