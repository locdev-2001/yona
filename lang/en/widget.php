<?php

// Nguồn: Chatwoot v4.17.1 app/javascript/widget/i18n/locale/en.json.
// Toàn bộ chuỗi của app widget nằm dưới namespace WIDGET vì bản gốc để chúng ở
// gốc bundle riêng của widget — gộp thẳng vào namespace dashboard sẽ đè lên các
// khóa trùng tên nhưng khác nội dung (THUMBNAIL.AUTHOR.NOT_AVAILABLE,
// COMPONENTS.FILE_BUBBLE, EMAIL_TRANSCRIPT...).

return [
    'COMPONENTS' => [
        'FILE_BUBBLE' => [
            'DOWNLOAD' => 'Download',
            'UPLOADING' => 'Uploading...',
        ],
        'FORM_BUBBLE' => [
            'SUBMIT' => 'Submit',
        ],
        'MESSAGE_BUBBLE' => [
            'RETRY' => 'Send message again',
            'ERROR_MESSAGE' => "Couldn't send, try again",
        ],
    ],
    'THUMBNAIL' => [
        'AUTHOR' => [
            'NOT_AVAILABLE' => 'Not available',
        ],
    ],
    'TEAM_AVAILABILITY' => [
        'ONLINE' => 'We are online',
        'OFFLINE' => 'We are away at the moment',
        'BACK_AS_SOON_AS_POSSIBLE' => 'We will be back as soon as possible',
    ],
    'REPLY_TIME' => [
        'IN_A_FEW_MINUTES' => 'Typically replies in a few minutes',
        'IN_A_FEW_HOURS' => 'Typically replies in a few hours',
        'IN_A_DAY' => 'Typically replies in a day',
        'BACK_IN_HOURS' => 'We will be back online in {n} hour | We will be back online in {n} hours',
        'BACK_IN_MINUTES' => 'We will be back online in {time} minutes',
        'BACK_AT_TIME' => 'We will be back online at {time}',
        'BACK_ON_DAY' => 'We will be back online on {day}',
        'BACK_TOMORROW' => 'We will be back online tomorrow',
        'BACK_IN_SOME_TIME' => 'We will be back online in some time',
    ],
    'DAY_NAMES' => [
        'SUNDAY' => 'Sunday',
        'MONDAY' => 'Monday',
        'TUESDAY' => 'Tuesday',
        'WEDNESDAY' => 'Wednesday',
        'THURSDAY' => 'Thursday',
        'FRIDAY' => 'Friday',
        'SATURDAY' => 'Saturday',
    ],
    'START_CONVERSATION' => 'Start Conversation',
    'END_CONVERSATION' => 'End Conversation',
    'CONTINUE_CONVERSATION' => 'Continue conversation',
    'YOU' => 'You',
    'START_NEW_CONVERSATION' => 'Start a new conversation',
    'RESET_SESSION' => [
        'BUTTON' => 'Start a new chat',
        'CONFIRM_TITLE' => 'Start a new chat?',
        'CONFIRM_BODY' => 'The chat will start over as a new visitor. Earlier messages will no longer show in this browser.',
        'CONFIRM' => 'Start over',
        'CANCEL' => 'Cancel',
    ],
    'VIEW_UNREAD_MESSAGES' => 'You have unread messages',
    'UNREAD_VIEW' => [
        'VIEW_MESSAGES_BUTTON' => 'See new messages',
        'CLOSE_MESSAGES_BUTTON' => 'Close',
        'COMPANY_FROM' => 'from',
        'BOT' => 'Bot',
    ],
    'BUBBLE' => [
        'LABEL' => 'Chat with us',
    ],
    'POWERED_BY' => 'Powered by Chatwoot',
    'EMAIL_PLACEHOLDER' => 'Please enter your email',
    'CHAT_PLACEHOLDER' => 'Type your message',
    'TODAY' => 'Today',
    'YESTERDAY' => 'Yesterday',
    'PRE_CHAT_FORM' => [
        'FIELDS' => [
            'FULL_NAME' => [
                'LABEL' => 'Full Name',
                'PLACEHOLDER' => 'Please enter your full name',
                'REQUIRED_ERROR' => 'Full Name is required',
            ],
            'EMAIL_ADDRESS' => [
                'LABEL' => 'Email Address',
                'PLACEHOLDER' => 'Please enter your email address',
                'REQUIRED_ERROR' => 'Email Address is required',
                'VALID_ERROR' => 'Please enter a valid email address',
            ],
            'PHONE_NUMBER' => [
                'LABEL' => 'Phone Number',
                'PLACEHOLDER' => 'Please enter your phone number',
                'REQUIRED_ERROR' => 'Phone Number is required',
                'DIAL_CODE_VALID_ERROR' => 'Please select a country code',
                'VALID_ERROR' => 'Please enter a valid phone number',
                'DROPDOWN_EMPTY' => 'No results found',
                'DROPDOWN_SEARCH' => 'Search country',
            ],
            'MESSAGE' => [
                'LABEL' => 'Message',
                'PLACEHOLDER' => 'Please enter your message',
                'ERROR' => 'Message too short',
            ],
        ],
        'CAMPAIGN_HEADER' => 'Please provide your name and email before starting the conversation',
        'IS_REQUIRED' => 'is required',
        'REQUIRED' => 'Required',
        'REGEX_ERROR' => 'Please provide a valid input',
    ],
    'FILE_SIZE_LIMIT' => 'File exceeds the {MAXIMUM_FILE_UPLOAD_SIZE} attachment limit',
    'CHAT_FORM' => [
        'INVALID' => [
            'FIELD' => 'Invalid field',
        ],
    ],
    'EMOJI' => [
        'PLACEHOLDER' => 'Search emojis',
        'NOT_FOUND' => 'No emoji match your search',
        'ARIA_LABEL' => 'Emoji picker',
    ],
    'EMOJI_ICON_PICKER' => [
        'SEARCH_EMOJI' => 'Search emoji…',
        'FREQUENTLY_USED' => 'Frequently used',
        'NO_EMOJI' => 'No emoji match your search',
    ],
    'CSAT' => [
        'TITLE' => 'Rate your conversation',
        'SUBMITTED_TITLE' => 'Thank you for submitting the rating',
        'PLACEHOLDER' => 'Tell us more...',
    ],
    'EMAIL_TRANSCRIPT' => [
        'BUTTON_TEXT' => 'Request a conversation transcript',
        'SEND_EMAIL_SUCCESS' => 'The chat transcript was sent successfully',
        'SEND_EMAIL_ERROR' => 'There was an error, please try again',
    ],
    'INTEGRATIONS' => [
        'DYTE' => [
            'CLICK_HERE_TO_JOIN' => 'Click here to join',
            'LEAVE_THE_ROOM' => 'Leave the call',
        ],
    ],
    'PORTAL' => [
        'POPULAR_ARTICLES' => 'Popular Articles',
        'VIEW_ALL_ARTICLES' => 'View all articles',
        'IFRAME_LOAD_ERROR' => 'There was an error loading the article, please refresh the page and try again.',
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
        'fallback' => [
            'CONTENT' => 'has shared a url',
        ],
    ],
    'FOOTER_REPLY_TO' => [
        'REPLY_TO' => 'Replying to:',
    ],
    'MESSAGE_ACTIONS' => [
        'REPLY' => 'Reply',
        'MORE' => 'More actions',
        'RECALL' => 'Unsend',
        'COPY' => 'Copy text',
    ],
    'RECALL' => [
        'CONFIRM_TITLE' => 'Unsend this message?',
        'CONFIRM_BODY' => 'The message will be removed for both sides. You can only unsend within {minutes} minutes of sending.',
        'CANCEL' => 'Cancel',
        'CONFIRM' => 'Unsend',
        'BY_YOU' => 'You unsent a message',
        'BY_THEM' => 'This message was unsent',
        'EXPIRED' => 'The time limit for unsending has passed.',
        'FAILED' => 'Could not unsend the message. Please try again.',
    ],
    'REPLY' => [
        'REPLYING_TO' => 'Replying to {name}',
        'YOU' => 'You',
        'CANCEL' => 'Cancel reply',
        'JUMP_TO_ORIGINAL' => 'View original message',
        'ORIGINAL_UNAVAILABLE' => 'Original message is no longer available',
    ],
    'DELIVERY' => [
        'SENT' => 'Sent',
        'DELIVERED' => 'Delivered',
        'SEEN' => 'Seen',
        'SENDING' => 'Sending…',
        'FAILED' => 'Not sent',
    ],
    'COMPOSER' => [
        'ADD' => 'Add photo or file',
        'STICKER' => 'Stickers and emoji',
        'SEND' => 'Send',
        'CAPTION_PLACEHOLDER' => 'Add a caption…',
        'ATTACH_IMAGE' => 'Photos',
        'ATTACH_IMAGE_HINT' => 'You can pick more than one',
        'ATTACH_FILE' => 'Files',
        'ATTACH_FILE_HINT' => 'Up to {size} per file',
        'SELECTED_COUNT' => '{count} photo selected | {count} photos selected',
        'REMOVE_ATTACHMENT' => 'Remove',
        'ADD_MORE' => 'Add more',
    ],
    'STICKER_PANEL' => [
        'TAB_STICKER' => 'Stickers',
        'TAB_EMOJI' => 'Emoji',
        'TAB_RECENT' => 'Recent',
        'RECENT_EMPTY' => 'Nothing here yet.',
        'STICKER_ALT' => 'Sticker',
    ],
    'ATTACHMENT_STATE' => [
        'UPLOADING' => 'Sending {count} photo… | Sending {count} photos…',
        'UPLOADING_FILE' => 'Sending file…',
        'UPLOAD_FAILED_TITLE' => 'Could not send the photo',
        'UPLOAD_FAILED_FILE_TITLE' => 'Could not send the file',
        'UPLOAD_FAILED_SIZE' => 'File is over {size}',
        'UPLOAD_FAILED_NETWORK' => 'Connection is unstable, please try again.',
        'RETRY' => 'Try again',
        'PHOTO_COUNT' => '{count} photo | {count} photos',
        'VIEW_ALL' => 'View all {count}',
    ],
    'EMPTY_STATE' => [
        'TITLE' => 'Hi there!',
        'BODY' => 'Send {name} a message about anything. You can attach photos, files or stickers.',
    ],
    'HEADER' => [
        'ONLINE' => 'Online',
        'AWAY' => 'Away',
        'CLOSE' => 'Close chat window',
    ],
    'OUT_OF_HOURS' => [
        'TITLE' => 'We are outside support hours',
        'BODY' => 'Leave a message and we will reply when we open again.',
        'EMAIL_PLACEHOLDER' => 'Email to receive our reply',
        'CTA' => 'Leave a message',
    ],
    'CONVERSATION_END' => [
        'TITLE' => 'This conversation has ended',
        'RATE_PROMPT' => 'How was your conversation?',
        'POOR' => 'Poor',
        'OKAY' => 'Okay',
        'GREAT' => 'Great',
        'FEEDBACK_PLACEHOLDER' => 'Any extra feedback (optional)',
        'SUBMIT' => 'Send rating',
        'THANKS' => 'Thanks for your rating!',
    ],
    'LAUNCHER' => [
        'OPEN' => 'Open chat',
        'CLOSE' => 'Minimize chat',
        'UNREAD' => '{count} unread message | {count} unread messages',
    ],
    'NEW_MESSAGES' => 'New messages',
    'CARD' => [
        'CTA_FALLBACK' => 'View details',
        'PREVIOUS' => 'Previous card',
        'NEXT' => 'Next card',
    ],
];
