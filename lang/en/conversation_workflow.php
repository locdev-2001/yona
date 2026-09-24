<?php

return [
    'INDEX' => [
        'HEADER' => [
            'TITLE' => 'Conversation Workflows',
            'DESCRIPTION' => 'Configure rules and required fields for conversation resolution.',
        ],
    ],
    'REQUIRED_ATTRIBUTES' => [
        'TITLE' => 'Attributes required on resolution',
        'DESCRIPTION' => 'When resolving a conversation, agents will be prompted to fill these attributes if they haven\'t yet.',
        'NO_ATTRIBUTES' => 'No attributes added yet',
        'ADD' => [
            'TITLE' => 'Add Attributes',
            'SEARCH_PLACEHOLDER' => 'Search attributes',
        ],
        'SAVE' => [
            'SUCCESS' => 'Required attributes updated',
            'ERROR' => 'Could not update required attributes, please try again',
        ],
        'MODAL' => [
            'TITLE' => 'Resolve conversation',
            'DESCRIPTION' => 'Please fill in the following custom attributes before resolving this conversation',
            'ACTIONS' => [
                'RESOLVE' => 'Resolve conversation',
                'CANCEL' => 'Cancel',
            ],
            'PLACEHOLDERS' => [
                'TEXT' => 'Write a note...',
                'NUMBER' => 'Enter a number',
                'LINK' => 'Add a link',
                'DATE' => 'Pick a date',
                'LIST' => 'Select an option',
            ],
            'CHECKBOX' => [
                'YES' => 'Yes',
                'NO' => 'No',
            ],
        ],
        'PAYWALL' => [
            'TITLE' => 'Upgrade to use required attributes',
            'AVAILABLE_ON' => 'The required conversation attributes feature is available on the Business and Enterprise plans.',
            'UPGRADE_PROMPT' => 'Upgrade your plan to prompt agents to fill required attributes before conversation resolution.',
            'UPGRADE_NOW' => 'Upgrade now',
            'CANCEL_ANYTIME' => 'You can change or cancel your plan anytime',
        ],
        'ENTERPRISE_PAYWALL' => [
            'AVAILABLE_ON' => 'The required conversation attributes feature is available on the paid plans.',
            'UPGRADE_PROMPT' => 'Upgrade to a paid plan to enforce required attributes before conversation resolution.',
            'ASK_ADMIN' => 'Please reach out to your administrator for the upgrade.',
        ],
    ],
];
