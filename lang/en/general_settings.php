<?php

return [
    'TITLE' => 'Account settings',
    'DESCRIPTION' => 'General settings for the whole business account.',
    'LANGUAGE' => [
        'TITLE' => 'Language',
        'NOTE' => 'Language of the website chat widget, and of the dashboard for anyone who has not picked their own. A page embedding the widget can still pick another language with the locale option in the embed code.',
        'UPDATE_SUCCESS' => 'Account language updated',
        'UPDATE_ERROR' => 'Could not update the account language, please try again',
    ],
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
