<?php

return [
    'COMPOSER' => [
        'PLACEHOLDER' => 'Type a message…',
    ],
    'TABS' => [
        'ALL' => 'All',
        'REQUESTS' => 'Requests',
    ],
    'NEW' => [
        'TITLE' => 'New message',
        'DESCRIPTION' => 'Find friends by @username or name.',
        'HINT' => 'Type at least 2 characters to search.',
    ],
    'EMPTY' => [
        'ALL' => 'No conversations yet. Tap the pen button to start one.',
        'REQUESTS' => 'No message requests.',
        'START' => 'Pick a conversation or start a new one',
    ],
    'REQUEST' => [
        'TITLE' => '{name} wants to message you',
        'BODY' => "They won't know you've seen their messages until you accept.",
        'ACCEPT' => 'Accept',
        'DELETE' => 'Delete',
        'BLOCK' => 'Block',
    ],
    'ACTIONS' => [
        'BLOCK' => 'Block',
        'UNBLOCK' => 'Unblock',
        'REPORT' => 'Report',
        'DELETE' => 'Delete conversation',
    ],
    'BLOCK' => [
        'BLOCKED' => 'Blocked',
        'UNBLOCKED' => 'Unblocked',
        'BANNER_BLOCKED_BY_ME' => 'You blocked this person. Unblock from the ⋮ menu to message again.',
        'BANNER_CANNOT_REPLY' => "You can't send messages in this conversation.",
        'COMPOSER_LOCKED' => "You can't send messages here",
    ],
    'REPORT' => [
        'TITLE' => 'Report {name}',
        'DESCRIPTION' => "The Yona team will review it. They won't know who reported them.",
        'REASON' => 'Reason',
        'REASONS' => [
            'SPAM' => 'Spam or ads',
            'HARASSMENT' => 'Harassment or threats',
            'INAPPROPRIATE' => 'Inappropriate content',
            'SCAM' => 'Scam',
            'OTHER' => 'Something else',
        ],
        'NOTE_PLACEHOLDER' => 'Add details (optional)',
        'SUBMIT' => 'Send report',
        'SENT' => 'Report sent',
    ],
    'DELETE' => [
        'TITLE' => 'Delete conversation?',
        'DESCRIPTION' => "It disappears from your list. The other person keeps it and isn't notified.",
        'CONFIRM' => 'Delete',
    ],
    'PREVIEW' => [
        'RECALLED' => 'Message unsent',
        'STICKER' => 'Sent a sticker',
        'BANK_TRANSFER' => 'Sent bank transfer details',
    ],
    'ERRORS' => [
        'BLOCKED' => "Can't send because one of you has blocked the other",
        'NOT_MEMBER' => "You're no longer in this conversation",
        'SELF' => "You can't message yourself",
        'EMPTY' => 'The message is empty',
    ],
];
