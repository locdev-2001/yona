<?php

// Nguồn: Chatwoot v4.17.1 dashboard/i18n/locale/en/contact.json — namespace MERGE_CONTACTS.

return [
    'TITLE' => 'Merge contacts',
    'DESCRIPTION' => 'Merge contacts to combine two profiles into one, including all attributes and conversations. In case of conflict, the Primary contact’s attributes will take precedence.',
    'PRIMARY' => [
        'TITLE' => 'Primary contact',
        'HELP_LABEL' => 'To be deleted',
    ],
    'PARENT' => [
        'TITLE' => 'Contact to merge',
        'PLACEHOLDER' => 'Search for a contact',
        'HELP_LABEL' => 'To be kept',
    ],
    'SUMMARY' => [
        'TITLE' => 'Summary',
        'DELETE_WARNING' => 'Contact of <strong>{primaryContactName}</strong> will be deleted.',
        'ATTRIBUTE_WARNING' => 'Contact details of <strong>{primaryContactName}</strong> will be copied to <strong>{parentContactName}</strong>.',
    ],
    'SEARCH' => [
        'ERROR_MESSAGE' => 'Something went wrong. Please try again later.',
    ],
    'FORM' => [
        'SUBMIT' => ' Merge contacts',
        'CANCEL' => 'Cancel',
        'CHILD_CONTACT' => [
            'ERROR' => 'Select a child contact to merge',
        ],
        'SUCCESS_MESSAGE' => 'Contact merged successfully',
        'ERROR_MESSAGE' => 'Could not merge contacts, try again!',
    ],
    'DROPDOWN_ITEM' => [
        'ID' => '(ID: {identifier})',
    ],
];
