<?php

return [
    'HEADER' => [
        'TITLE' => 'Contacts',
        'SEARCH_TITLE' => 'Search contacts',
        'ACTIVE_TITLE' => 'Active contacts',
        'SEARCH_PLACEHOLDER' => 'Search...',
        'MESSAGE_BUTTON' => 'Message',
        'SEND_MESSAGE' => 'Send message',
        'BLOCK_CONTACT' => 'Block contact',
        'UNBLOCK_CONTACT' => 'Unblock contact',
        'BREADCRUMB' => [
            'CONTACTS' => 'Contacts',
        ],
        'ACTIONS' => [
            'CONTACT_CREATION' => [
                'ADD_CONTACT' => 'Add contact',
                'EXPORT_CONTACT' => 'Export contacts',
                'IMPORT_CONTACT' => 'Import contacts',
                'SAVE_CONTACT' => 'Save contact',
                'EMAIL_ADDRESS_DUPLICATE' => 'This email address is in use for another contact.',
                'PHONE_NUMBER_DUPLICATE' => 'This phone number is in use for another contact.',
                'SUCCESS_MESSAGE' => 'Contact saved successfully',
                'ERROR_MESSAGE' => 'Unable to save contact. Please try again later.',
            ],
            'BLOCK_SUCCESS_MESSAGE' => 'This contact is blocked successfully',
            'BLOCK_ERROR_MESSAGE' => 'Unable to block contact. Please try again later.',
            'UNBLOCK_SUCCESS_MESSAGE' => 'This contact is unblocked successfully',
            'UNBLOCK_ERROR_MESSAGE' => 'Unable to unblock contact. Please try again later.',
            'IMPORT_CONTACT' => [
                'TITLE' => 'Import contacts',
                'DESCRIPTION' => 'Import contacts through a CSV file.',
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
                    'PROCESSING' => 'Importing contacts...',
                    'COMPLETED' => 'Imported {processed} of {total} rows.',
                    'FAILED' => 'The import failed.',
                ],
                'DOWNLOAD_FAILED_RECORDS' => 'Download the rows that could not be imported',
            ],
            'EXPORT_CONTACT' => [
                'TITLE' => 'Export contacts',
                'DESCRIPTION' => 'Quickly export a csv file with comprehensive details of your contacts',
                'CONFIRM' => 'Export',
                'SUCCESS_MESSAGE' => 'Export is in progress. You will be notified on email when the export file is ready to download.',
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
        'SHOWING' => 'Showing {startItem} - {endItem} of {totalItems} contact | Showing {startItem} - {endItem} of {totalItems} contacts',
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
        'TITLE' => 'Filter contacts',
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
    'CARD' => [
        'OF' => 'of',
        'VIEW_DETAILS' => 'View details',
        'EDIT_DETAILS_FORM' => [
            'TITLE' => 'Edit contact details',
            'FORM' => [
                'FIRST_NAME' => [
                    'PLACEHOLDER' => 'Enter the first name',
                ],
                'LAST_NAME' => [
                    'PLACEHOLDER' => 'Enter the last name',
                ],
                'EMAIL_ADDRESS' => [
                    'PLACEHOLDER' => 'Enter the email address',
                    'DUPLICATE' => 'This email address is in use for another contact.',
                ],
                'PHONE_NUMBER' => [
                    'PLACEHOLDER' => 'Enter the phone number',
                    'DUPLICATE' => 'This phone number is in use for another contact.',
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
            'UPDATE_BUTTON' => 'Update contact',
            'SUCCESS_MESSAGE' => 'Contact updated successfully',
            'ERROR_MESSAGE' => 'Unable to update contact. Please try again later.',
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
        'DELETE_CONTACT_DESCRIPTION' => 'Permanently delete this contact. This action is irreversible',
        'DELETE_CONTACT' => 'Delete contact',
        'DELETE_DIALOG' => [
            'TITLE' => 'Confirm Deletion',
            'DESCRIPTION' => 'Are you sure you want to delete this contact?',
            'CONFIRM' => 'Yes, Delete',
            'API' => [
                'SUCCESS_MESSAGE' => 'Contact deleted successfully',
                'ERROR_MESSAGE' => 'Could not delete contact. Please try again later.',
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
            'MERGE' => 'Merge',
        ],
        'HISTORY' => [
            'EMPTY_STATE' => 'There are no previous conversations associated to this contact',
        ],
        'ATTRIBUTES' => [
            'SEARCH_PLACEHOLDER' => 'Search for attributes',
            'UNUSED_ATTRIBUTES' => '{count} Used attribute | {count} Unused attributes',
            'EMPTY_STATE' => 'There are no contact custom attributes available in this account. You can create a custom attribute in settings.',
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
            'TITLE' => 'Merge contact',
            'DESCRIPTION' => 'Combine two profiles into one, including all attributes and conversations. In case of conflict, the primary contact’s attributes will take precedence.',
            'PRIMARY' => 'Primary contact',
            'PRIMARY_HELP_LABEL' => 'To be saved',
            'PRIMARY_REQUIRED_ERROR' => 'Please select a contact to merge with before proceeding',
            'PARENT' => 'To be merged',
            'PARENT_HELP_LABEL' => 'To be deleted',
            'EMPTY_STATE' => 'No contacts found',
            'PLACEHOLDER' => 'Search for primary contact',
            'SEARCH_PLACEHOLDER' => 'Search for a contact',
            'SEARCH_ERROR_MESSAGE' => 'Could not search for contacts. Please try again later.',
            'SUCCESS_MESSAGE' => 'Contact merged successfully',
            'ERROR_MESSAGE' => 'Could not merge contacts, try again!',
            'IS_SEARCHING' => 'Searching...',
            'BUTTONS' => [
                'CANCEL' => 'Cancel',
                'CONFIRM' => 'Merge contact',
            ],
        ],
        'NOTES' => [
            'PLACEHOLDER' => 'Add a note',
            'WROTE' => 'wrote',
            'YOU' => 'You',
            'SAVE' => 'Save note',
            'ADD_NOTE' => 'Add contact note',
            'EXPAND' => 'Expand',
            'COLLAPSE' => 'Collapse',
            'NO_NOTES' => 'No notes, you can add notes from the contact details page.',
            'EMPTY_STATE' => 'There are no notes associated to this contact. You can add a note by typing in the box above.',
            'CONVERSATION_EMPTY_STATE' => 'There are no notes yet. Use the Add note button to create one.',
        ],
    ],
    'EMPTY_STATE' => [
        'TITLE' => 'No contacts found in this account',
        'SUBTITLE' => 'Start adding new contacts by clicking on the button below',
        'BUTTON_LABEL' => 'Add contact',
        'SEARCH_EMPTY_STATE_TITLE' => 'No contacts matches your search 🔍',
        'LIST_EMPTY_STATE_TITLE' => 'No contacts available in this view 📋',
        'ACTIVE_EMPTY_STATE_TITLE' => 'No contacts are active at the moment 🌙',
    ],
    'LOAD_MORE' => 'Load more',
];
