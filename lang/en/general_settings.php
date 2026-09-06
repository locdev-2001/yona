<?php

// Nguồn: Chatwoot v4.17.1 dashboard/i18n/locale/en/index.ts (inline) — namespace GENERAL_SETTINGS.

return [
    'BACK' => 'Back',
    'FORM' => [
        'AUTO_RESOLVE' => [
            'TITLE' => 'Auto-resolve conversations',
            'NOTE' => 'This configuration would allow you to automatically resolve the conversation after a certain period of inactivity.',
            'DURATION' => [
                'LABEL' => 'Inactivity duration',
                'HELP' => 'Time period of inactivity after which conversation is auto-resolved',
                'PLACEHOLDER' => '30',
                'ERROR' => 'Auto resolve duration should be between 10 minutes and 999 days',
                'API' => [
                    'SUCCESS' => 'Auto resolve settings updated successfully',
                    'ERROR' => 'Failed to update auto resolve settings',
                ],
            ],
            'MESSAGE' => [
                'LABEL' => 'Custom auto-resolution message',
                'PLACEHOLDER' => 'Conversation was marked resolved by system due to 15 days of inactivity',
                'HELP' => 'Message sent to the customer after conversation is auto-resolved',
            ],
            'PREFERENCES' => 'Preferences',
            'LABEL' => [
                'LABEL' => 'Add label after auto-resolution',
                'PLACEHOLDER' => 'Select a label',
            ],
            'IGNORE_WAITING' => [
                'LABEL' => 'Skip conversations waiting for agent’s reply',
            ],
            'UPDATE_BUTTON' => 'Save Changes',
        ],
    ],
];
