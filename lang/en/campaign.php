<?php

// Chỉ có khối LIVE_CHAT + CONFIRM_DELETE (tab Live chat); khối SMS/WHATSAPP
// đi cùng kênh của chúng.

return [
    'LIVE_CHAT' => [
        'HEADER_TITLE' => 'Live chat campaigns',
        'NEW_CAMPAIGN' => 'Create campaign',
        'CARD' => [
            'STATUS' => [
                'ENABLED' => 'Enabled',
                'DISABLED' => 'Disabled',
            ],
            'CAMPAIGN_DETAILS' => [
                'SENT_BY' => 'Sent by',
                'BOT' => 'Bot',
                'FROM' => 'from',
                'URL' => 'URL:',
            ],
        ],
        'EMPTY_STATE' => [
            'TITLE' => 'No live chat campaigns are available',
            'SUBTITLE' => "Connect with your customers using proactive messages.  Click 'Create campaign' to get started.",
        ],
        'CREATE' => [
            'TITLE' => 'Create a live chat campaign',
            'CANCEL_BUTTON_TEXT' => 'Cancel',
            'CREATE_BUTTON_TEXT' => 'Create',
            'FORM' => [
                'TITLE' => [
                    'LABEL' => 'Title',
                    'PLACEHOLDER' => 'Please enter the title of campaign',
                    'ERROR' => 'Title is required',
                ],
                'MESSAGE' => [
                    'LABEL' => 'Message',
                    'PLACEHOLDER' => 'Please enter the message of campaign',
                    'ERROR' => 'Message is required',
                ],
                'INBOX' => [
                    'LABEL' => 'Select Inbox',
                    'PLACEHOLDER' => 'Select Inbox',
                    'ERROR' => 'Inbox is required',
                ],
                'SENT_BY' => [
                    'LABEL' => 'Sent by',
                    'PLACEHOLDER' => 'Please select sender',
                    'ERROR' => 'Sender is required',
                ],
                'END_POINT' => [
                    'LABEL' => 'URL',
                    'PLACEHOLDER' => 'Please enter the URL',
                    'ERROR' => 'Please enter a valid URL',
                ],
                'TIME_ON_PAGE' => [
                    'LABEL' => 'Time on page(Seconds)',
                    'PLACEHOLDER' => 'Please enter the time',
                    'ERROR' => 'Time on page is required',
                ],
                'QUICK_REPLIES' => [
                    'LABEL' => 'Quick reply chips',
                    'HINT' => 'Up to 3 chips under the invitation. Tapping one opens the chat and sends that text.',
                    'PLACEHOLDER' => 'E.g. Is this in stock?',
                    'ITEM' => 'Chip {index}',
                    'ERROR' => 'Each chip is at most 40 characters and must be unique',
                ],
                'SHOW_TO' => [
                    'LABEL' => 'Show to',
                    'ALL' => 'Everyone',
                    'NEW' => 'Visitors who never messaged',
                    'RETURNING' => 'Visitors who messaged before',
                ],
                'OTHER_PREFERENCES' => [
                    'TITLE' => 'Other preferences',
                    'ENABLED' => 'Enable campaign',
                    'TRIGGER_ONLY_BUSINESS_HOURS' => 'Trigger only during business hours',
                ],
                'BUTTONS' => [
                    'CREATE' => 'Create',
                    'CANCEL' => 'Cancel',
                ],
                'API' => [
                    'SUCCESS_MESSAGE' => 'Live chat campaign created successfully',
                    'ERROR_MESSAGE' => 'There was an error. Please try again.',
                ],
            ],
        ],
        'EDIT' => [
            'TITLE' => 'Edit live chat campaign',
            'FORM' => [
                'API' => [
                    'SUCCESS_MESSAGE' => 'Live chat campaign updated successfully',
                    'ERROR_MESSAGE' => 'There was an error. Please try again.',
                ],
            ],
        ],
    ],
    'CONFIRM_DELETE' => [
        'TITLE' => 'Are you sure to delete?',
        'DESCRIPTION' => 'The delete action is permanent and cannot be reversed.',
        'CONFIRM' => 'Delete',
        'API' => [
            'SUCCESS_MESSAGE' => 'Campaign deleted successfully',
            'ERROR_MESSAGE' => 'There was an error. Please try again.',
        ],
    ],
];
