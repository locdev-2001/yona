<?php

return [
    'HEADER' => [
        'TITLE' => 'Friends',
        'SEARCH_TITLE' => 'Search people',
        'ACTIVE_TITLE' => 'Active now',
        'SEARCH_PLACEHOLDER' => 'Search...',
        'MESSAGE_BUTTON' => 'Message',
        'SEND_MESSAGE' => 'Send message',
        'BLOCK_CONTACT' => 'Block',
        'UNBLOCK_CONTACT' => 'Unblock',
        'BREADCRUMB' => [
            'CONTACTS' => 'Friends',
        ],
        'ACTIONS' => [
            'CONTACT_CREATION' => [
                'ADD_CONTACT' => 'Add person',
                'EXPORT_CONTACT' => 'Export list',
                'IMPORT_CONTACT' => 'Import list',
                'SAVE_CONTACT' => 'Save',
                'EMAIL_ADDRESS_DUPLICATE' => 'This email address already belongs to another profile.',
                'PHONE_NUMBER_DUPLICATE' => 'This phone number already belongs to another profile.',
                'SUCCESS_MESSAGE' => 'Saved successfully',
                'ERROR_MESSAGE' => 'Unable to save. Please try again later.',
            ],
            'BLOCK_SUCCESS_MESSAGE' => 'This person is blocked',
            'BLOCK_ERROR_MESSAGE' => 'Unable to block. Please try again later.',
            'UNBLOCK_SUCCESS_MESSAGE' => 'This person is unblocked',
            'UNBLOCK_ERROR_MESSAGE' => 'Unable to unblock. Please try again later.',
            'IMPORT_CONTACT' => [
                'TITLE' => 'Import list',
                'DESCRIPTION' => 'Import a list from a CSV file.',
                'DOWNLOAD_LABEL' => 'Download a sample csv.',
                'LABEL' => 'CSV File:',
                'CHOOSE_FILE' => 'Choose file',
                'CHANGE' => 'Change',
                'CANCEL' => 'Cancel',
                'IMPORT' => 'Import',
                'SUCCESS_MESSAGE' => 'You will be notified via email when the import is complete.',
                'ERROR_MESSAGE' => 'There was an error, please try again',
                // Thêm so bản gốc: hộp thoại theo dõi trạng thái lần nhập ngay tại chỗ.
                'STATUS' => [
                    'PENDING' => 'Import queued...',
                    'PROCESSING' => 'Importing list...',
                    'COMPLETED' => 'Imported {processed} of {total} rows.',
                    'FAILED' => 'The import failed.',
                ],
                'DOWNLOAD_FAILED_RECORDS' => 'Download the rows that could not be imported',
            ],
            'EXPORT_CONTACT' => [
                'TITLE' => 'Export list',
                'DESCRIPTION' => 'Quickly export a CSV file with full details of everyone on your list',
                'CONFIRM' => 'Export',
                'SUCCESS_MESSAGE' => 'Export is in progress. We will email you a download link when the export file is ready.',
                'ERROR_MESSAGE' => 'There was an error, please try again',
            ],
            'SORT_BY' => [
                'LABEL' => 'Sort by',
                'OPTIONS' => [
                    'NAME' => 'Name',
                    'EMAIL' => 'Email',
                    'PHONE_NUMBER' => 'Phone number',
                    'COMPANY' => 'Company',
                    'COUNTRY' => 'Country',
                    'CITY' => 'City',
                    'LAST_ACTIVITY' => 'Last activity',
                    'CREATED_AT' => 'Created at',
                ],
            ],
            'ORDER' => [
                'LABEL' => 'Ordering',
                'OPTIONS' => [
                    'ASCENDING' => 'Ascending',
                    'DESCENDING' => 'Descending',
                ],
            ],
            'FILTERS' => [
                'CREATE_SEGMENT' => [
                    'TITLE' => 'Do you want to save this filter?',
                    'CONFIRM' => 'Save filter',
                    'LABEL' => 'Name',
                    'PLACEHOLDER' => 'Enter the name of the filter',
                    'ERROR' => 'Enter a valid name',
                    'SUCCESS_MESSAGE' => 'Filter saved successfully',
                    'ERROR_MESSAGE' => 'Unable to save filter. Please try again later.',
                ],
                'DELETE_SEGMENT' => [
                    'TITLE' => 'Confirm Deletion',
                    'DESCRIPTION' => 'Are you sure you want to delete this filter?',
                    'CONFIRM' => 'Yes, Delete',
                    'CANCEL' => 'No, Cancel',
                    'SUCCESS_MESSAGE' => 'Filter deleted successfully',
                    'ERROR_MESSAGE' => 'Unable to delete filter. Please try again later.',
                ],
            ],
        ],
    ],
    'PAGINATION_FOOTER' => [
        'SHOWING' => 'Showing {startItem} - {endItem} of {totalItems} person | Showing {startItem} - {endItem} of {totalItems} people',
    ],
    'FILTER' => [
        'NAME' => 'Name',
        'EMAIL' => 'Email',
        'PHONE_NUMBER' => 'Phone number',
        'IDENTIFIER' => 'Identifier',
        'COUNTRY' => 'Country',
        'CITY' => 'City',
        'COMPANY' => 'Company',
        'CREATED_AT' => 'Created at',
        'LAST_ACTIVITY' => 'Last activity',
        'REFERER_LINK' => 'Referer link',
        'BLOCKED' => 'Blocked',
        'BLOCKED_TRUE' => 'True',
        'BLOCKED_FALSE' => 'False',
        'BUTTONS' => [
            'CLEAR_FILTERS' => 'Clear filters',
            'UPDATE_SEGMENT' => 'Update segment',
            'APPLY_FILTERS' => 'Apply filters',
            'ADD_FILTER' => 'Add filter',
        ],
        'TITLE' => 'Filter list',
        'EDIT_SEGMENT' => 'Edit segment',
        'SEGMENT' => [
            'LABEL' => 'Segment name',
            'INPUT_PLACEHOLDER' => 'Enter the name of the segment',
        ],
        'ACTIVE_FILTERS' => [
            'MORE_FILTERS' => '+ {count} more filters',
            'CLEAR_FILTERS' => 'Clear filters',
        ],
    ],
    'FRIENDS' => [
        'TITLE' => 'Friends',
        'TABS' => [
            'ONLINE' => 'Online',
            'ALL' => 'All',
            'PENDING' => 'Pending',
        ],
        'ADD_FRIEND' => 'Add Friend',
        'SEARCH_PLACEHOLDER' => 'Search friends',
        'SECTION' => '{label} — {count}',
        'STATUS_ONLINE' => 'Online',
        'STATUS_OFFLINE' => 'Offline',
        'MESSAGE' => 'Message',
        'MORE' => 'More',
        'VIEW_PROFILE' => 'View profile',
        'REMOVE' => 'Remove from list',
        'EMPTY' => [
            'ONLINE' => 'No friends are online right now.',
            'ALL' => 'No friends yet. Use Add Friend to find people by @username.',
            'PENDING' => 'Nobody is waiting on you.',
            'SEARCH' => 'Nobody matches that search.',
        ],
    ],
    'IDENTIFICATION' => [
        'ALL' => 'All',
        'IDENTIFIED' => 'Identified',
        'UNIDENTIFIED' => 'Unidentified',
    ],
    'CARD' => [
        'OF' => 'of',
        'UNIDENTIFIED_BADGE' => 'Unidentified',
        'UNIDENTIFIED_HINT' => 'No email, phone number or identifier yet — known only through the messaging channel.',
        'VIEW_DETAILS' => 'View details',
        'EDIT_DETAILS_FORM' => [
            'TITLE' => 'Personal info',
            'FORM' => [
                'FIRST_NAME' => [
                    'PLACEHOLDER' => 'Enter the first name',
                ],
                'LAST_NAME' => [
                    'PLACEHOLDER' => 'Enter the last name',
                ],
                'EMAIL_ADDRESS' => [
                    'PLACEHOLDER' => 'Enter the email address',
                    'DUPLICATE' => 'This email address already belongs to another profile.',
                ],
                'PHONE_NUMBER' => [
                    'PLACEHOLDER' => 'Enter the phone number',
                    'DUPLICATE' => 'This phone number already belongs to another profile.',
                ],
                'CITY' => [
                    'PLACEHOLDER' => 'Enter the city name',
                ],
                'COUNTRY' => [
                    'PLACEHOLDER' => 'Select country',
                ],
                'BIO' => [
                    'PLACEHOLDER' => 'Enter the bio',
                ],
                'COMPANY_NAME' => [
                    'PLACEHOLDER' => 'Enter the company name',
                ],
            ],
            'UPDATE_BUTTON' => 'Save changes',
            'SUCCESS_MESSAGE' => 'Changes saved',
            'ERROR_MESSAGE' => 'Unable to save changes. Please try again later.',
        ],
        'SOCIAL_MEDIA' => [
            'TITLE' => 'Edit social links',
            'FORM' => [
                'FACEBOOK' => [
                    'PLACEHOLDER' => 'Add Facebook',
                ],
                'GITHUB' => [
                    'PLACEHOLDER' => 'Add Github',
                ],
                'INSTAGRAM' => [
                    'PLACEHOLDER' => 'Add Instagram',
                ],
                'TELEGRAM' => [
                    'PLACEHOLDER' => 'Add Telegram',
                ],
                'TIKTOK' => [
                    'PLACEHOLDER' => 'Add TikTok',
                ],
                'LINKEDIN' => [
                    'PLACEHOLDER' => 'Add LinkedIn',
                ],
                'TWITTER' => [
                    'PLACEHOLDER' => 'Add Twitter',
                ],
            ],
        ],
        'DELETE_CONTACT' => [
            'MESSAGE' => 'This action is permanent and irreversible.',
            'BUTTON' => 'Delete now',
        ],
    ],
    'DETAILS' => [
        'CREATED_AT' => 'Created {date}',
        'LAST_ACTIVITY' => 'Last active {date}',
        'DELETE_CONTACT_DESCRIPTION' => 'Permanently remove this person from your list. This action is irreversible.',
        'DELETE_CONTACT' => 'Remove from list',
        'DELETE_DIALOG' => [
            'TITLE' => 'Confirm Deletion',
            'DESCRIPTION' => 'Are you sure you want to remove this person from your list?',
            'CONFIRM' => 'Yes, Delete',
            'API' => [
                'SUCCESS_MESSAGE' => 'Removed from your list',
                'ERROR_MESSAGE' => 'Could not remove. Please try again later.',
            ],
        ],
        'AVATAR' => [
            'UPLOAD' => [
                'ERROR_MESSAGE' => 'Could not upload avatar. Please try again later.',
                'SUCCESS_MESSAGE' => 'Avatar uploaded successfully',
            ],
            'DELETE' => [
                'SUCCESS_MESSAGE' => 'Avatar deleted successfully',
                'ERROR_MESSAGE' => 'Could not delete avatar. Please try again later.',
            ],
        ],
    ],
    'SIDEBAR' => [
        'TABS' => [
            'ATTRIBUTES' => 'Attributes',
            'HISTORY' => 'History',
            'NOTES' => 'Notes',
            'MEDIA' => 'Media',
            'MERGE' => 'Merge profiles',
        ],
        'HISTORY' => [
            'EMPTY_STATE' => 'No previous conversations with this person',
        ],
        'ATTRIBUTES' => [
            'SEARCH_PLACEHOLDER' => 'Search for attributes',
            'UNUSED_ATTRIBUTES' => '{count} Used attribute | {count} Unused attributes',
            'EMPTY_STATE' => 'There are no custom attributes yet. You can create one in settings.',
            'YES' => 'Yes',
            'NO' => 'No',
            'TRIGGER' => [
                'SELECT' => 'Select value',
                'INPUT' => 'Enter value',
            ],
            'VALIDATIONS' => [
                'INVALID_NUMBER' => 'Invalid number',
                'REQUIRED' => 'Valid value is required',
                'INVALID_INPUT' => 'Invalid input',
                'INVALID_URL' => 'Invalid URL',
                'INVALID_DATE' => 'Invalid date',
            ],
            'NO_ATTRIBUTES' => 'No attributes found',
            'API' => [
                'SUCCESS_MESSAGE' => 'Attribute updated successfully',
                'DELETE_SUCCESS_MESSAGE' => 'Attribute deleted successfully',
                'UPDATE_ERROR' => 'Unable to update attribute. Please try again later',
                'DELETE_ERROR' => 'Unable to delete attribute. Please try again later',
            ],
        ],
        'MERGE' => [
            'TITLE' => 'Merge profiles',
            'DESCRIPTION' => 'Combine two profiles into one, including all attributes and conversations. In case of conflict, the primary profile’s attributes will take precedence.',
            'PRIMARY' => 'Primary profile',
            'PRIMARY_HELP_LABEL' => 'To be saved',
            'PRIMARY_REQUIRED_ERROR' => 'Please select a profile to merge with before proceeding',
            'PARENT' => 'To be merged',
            'PARENT_HELP_LABEL' => 'To be deleted',
            'EMPTY_STATE' => 'No one found',
            'PLACEHOLDER' => 'Search for the primary profile',
            'SEARCH_PLACEHOLDER' => 'Search for a profile',
            'SEARCH_ERROR_MESSAGE' => 'Could not search. Please try again later.',
            'SUCCESS_MESSAGE' => 'Profiles merged',
            'ERROR_MESSAGE' => 'Could not merge profiles, try again!',
            'IS_SEARCHING' => 'Searching...',
            'BUTTONS' => [
                'CANCEL' => 'Cancel',
                'CONFIRM' => 'Merge profiles',
            ],
        ],
        'NOTES' => [
            'PLACEHOLDER' => 'Add a note',
            'WROTE' => 'wrote',
            'YOU' => 'You',
            'SAVE' => 'Save note',
            'ADD_NOTE' => 'Add a note for this person',
            'EXPAND' => 'Expand',
            'COLLAPSE' => 'Collapse',
            'NO_NOTES' => 'No notes, you can add notes from the profile page.',
            'EMPTY_STATE' => 'This person has no notes yet. You can add a note by typing in the box above.',
            'CONVERSATION_EMPTY_STATE' => 'There are no notes yet. Use the Add note button to create one.',
        ],
    ],
    'EMPTY_STATE' => [
        'TITLE' => 'Your list is empty',
        'SUBTITLE' => 'Click the button below to add your first person',
        'BUTTON_LABEL' => 'Add person',
        'SEARCH_EMPTY_STATE_TITLE' => 'No one matches your search 🔍',
        'LIST_EMPTY_STATE_TITLE' => 'No one in this list yet 📋',
        'ACTIVE_EMPTY_STATE_TITLE' => 'No one is active at the moment 🌙',
    ],
    'LOAD_MORE' => 'Load more',
];
