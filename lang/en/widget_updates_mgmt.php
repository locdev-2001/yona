<?php

return [
    'HEADER' => 'Widget updates',
    'HEADER_BTN_TXT' => 'Add update',
    'DESCRIPTION' => 'Post promos, new products or announcements to the Updates tab of the website chat widget.',
    'LOADING' => 'Loading updates',
    'SEARCH_PLACEHOLDER' => 'Search updates...',
    'NO_RESULTS' => 'No matching updates found',
    'LIST' => [
        '404' => 'No updates yet. Add the first one so customers see it in the Updates tab.',
        'TABLE_HEADER' => [
            'COVER' => 'Cover',
            'TITLE' => 'Title',
            'TAG' => 'Tag',
            'INBOX' => 'Inbox',
            'STATUS' => 'Status',
            'ACTION' => 'Action',
        ],
        'ALL_INBOXES' => 'All websites',
        'STATUS_DRAFT' => 'Draft',
        'STATUS_PUBLISHED' => 'Published',
    ],
    'FORM' => [
        'TITLE' => [
            'LABEL' => 'Title',
            'PLACEHOLDER' => '15% off the blue-glaze collection until 09/30',
            'REQUIRED_ERROR' => 'Title is required',
            'MAX_ERROR' => 'Title is at most 120 characters',
        ],
        'BODY' => [
            'LABEL' => 'Content',
            'PLACEHOLDER' => 'Describe the update. Line breaks are kept as-is on the widget.',
            'MAX_ERROR' => 'Content is at most 5000 characters',
        ],
        'TAG' => [
            'LABEL' => 'Tag',
        ],
        'COVER' => [
            'LABEL' => 'Cover image',
            'UPLOAD_BTN' => 'Upload image',
            'REPLACE_BTN' => 'Replace image',
            'REMOVE_BTN' => 'Remove image',
            'UPLOAD_ERROR' => 'Upload failed, please try again',
        ],
        'CTA_LABEL' => [
            'LABEL' => 'Button text',
            'PLACEHOLDER' => 'View collection',
            'REQUIRED_ERROR' => 'Button text is required when a link is set',
            'MAX_ERROR' => 'At most 40 characters',
        ],
        'CTA_URL' => [
            'LABEL' => 'Button link',
            'PLACEHOLDER' => 'https://...',
            'INVALID_ERROR' => 'Link must start with http:// or https://',
        ],
        'INBOX' => [
            'LABEL' => 'Show in inbox',
            'PLACEHOLDER' => 'All websites',
        ],
        'PREVIEW_TITLE' => 'Preview on the widget',
        'SAVE_DRAFT' => 'Save draft',
        'PUBLISH' => 'Publish',
        'UNPUBLISH' => 'Unpublish',
        'CANCEL' => 'Cancel',
        'EDIT' => 'Edit',
        'DELETE' => 'Delete',
    ],
    'ADD' => [
        'TITLE' => 'Add update',
        'DESC' => 'New posts are saved as a draft until you press Publish.',
        'API' => [
            'SUCCESS_MESSAGE' => 'Update saved',
            'ERROR_MESSAGE' => 'Something went wrong, please try again',
        ],
    ],
    'EDIT' => [
        'TITLE' => 'Edit update',
        'API' => [
            'SUCCESS_MESSAGE' => 'Changes saved',
            'ERROR_MESSAGE' => 'Something went wrong, please try again',
        ],
    ],
    'PUBLISH' => [
        'API' => [
            'SUCCESS_MESSAGE' => 'Published to the widget',
            'ERROR_MESSAGE' => 'Publishing failed, please try again',
        ],
    ],
    'UNPUBLISH' => [
        'API' => [
            'SUCCESS_MESSAGE' => 'Removed from the widget',
            'ERROR_MESSAGE' => 'Unpublishing failed, please try again',
        ],
    ],
    'DELETE' => [
        'CONFIRM' => [
            'TITLE' => 'Confirm deletion',
            'MESSAGE' => 'Are you sure you want to delete',
            'YES' => 'Yes, delete',
            'NO' => 'No, keep it',
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Update deleted',
            'ERROR_MESSAGE' => 'Something went wrong, please try again',
        ],
    ],
];
