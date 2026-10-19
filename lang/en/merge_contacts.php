<?php

return [
    'TITLE' => 'Merge profiles',
    'DESCRIPTION' => 'Combine two profiles into one, including all attributes and conversations. In case of conflict, the primary profile’s attributes will take precedence.',
    'PRIMARY' => [
        'TITLE' => 'Primary profile',
        'HELP_LABEL' => 'To be deleted',
    ],
    'PARENT' => [
        'TITLE' => 'Profile to merge',
        'PLACEHOLDER' => 'Search for a profile',
        'HELP_LABEL' => 'To be kept',
    ],
    'SUMMARY' => [
        'TITLE' => 'Summary',
        'DELETE_WARNING' => 'The profile of <strong>{primaryContactName}</strong> will be deleted.',
        'ATTRIBUTE_WARNING' => 'Details of <strong>{primaryContactName}</strong> will be copied to <strong>{parentContactName}</strong>.',
    ],
    'SEARCH' => [
        'ERROR_MESSAGE' => 'Something went wrong. Please try again later.',
    ],
    'FORM' => [
        'SUBMIT' => ' Merge profiles',
        'CANCEL' => 'Cancel',
        'CHILD_CONTACT' => [
            'ERROR' => 'Select a profile to merge',
        ],
        'SUCCESS_MESSAGE' => 'Profiles merged',
        'ERROR_MESSAGE' => 'Could not merge profiles, try again!',
    ],
    'DROPDOWN_ITEM' => [
        'ID' => '(ID: {identifier})',
    ],
];
