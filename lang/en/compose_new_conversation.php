<?php

// Nguồn: Chatwoot v4.17.1 dashboard/i18n/locale/en/contact.json — namespace COMPOSE_NEW_CONVERSATION.

return [
    'CONTACT_SEARCH' => [
        'ERROR_MESSAGE' => 'We couldn’t complete the search. Please try again.',
    ],
    'CONTACT_CREATE' => [
        'ERROR_MESSAGE' => 'We couldn’t create the contact. Please try again.',
    ],
    'FORM' => [
        'GO_TO_CONVERSATION' => 'View',
        'SUCCESS_MESSAGE' => 'The message was sent successfully!',
        'ERROR_MESSAGE' => 'An error occurred while creating the conversation. Please try again later.',
        'NO_INBOX_ALERT' => 'There are no available inboxes to start a conversation with this contact.',
        'CONTACT_SELECTOR' => [
            'LABEL' => 'To:',
            'TAG_INPUT_PLACEHOLDER' => 'Enter at least 2 characters to search by name, email, or phone number',
            'CONTACT_CREATING' => 'Creating contact...',
        ],
        'INBOX_SELECTOR' => [
            'LABEL' => 'Via:',
            'BUTTON' => 'Show inboxes',
        ],
        'EMAIL_OPTIONS' => [
            'SUBJECT_LABEL' => 'Subject :',
            'SUBJECT_PLACEHOLDER' => 'Enter your email subject here',
            'CC_LABEL' => 'Cc:',
            'CC_PLACEHOLDER' => 'Enter at least 2 characters to search by email',
            'BCC_LABEL' => 'Bcc:',
            'BCC_PLACEHOLDER' => 'Enter at least 2 characters to search by email',
            'BCC_BUTTON' => 'Bcc',
        ],
        'MESSAGE_EDITOR' => [
            'PLACEHOLDER' => 'Write your message here...',
        ],
        'WHATSAPP_OPTIONS' => [
            'LABEL' => 'Select template',
            'SEARCH_PLACEHOLDER' => 'Search templates',
            'EMPTY_STATE' => 'No templates found',
            'TEMPLATE_PARSER' => [
                'TEMPLATE_NAME' => 'WhatsApp template: {templateName}',
                'VARIABLES' => 'Variables',
                'BACK' => 'Go back',
                'SEND_MESSAGE' => 'Send message',
            ],
        ],
        'TWILIO_OPTIONS' => [
            'LABEL' => 'Select template',
            'SEARCH_PLACEHOLDER' => 'Search templates',
            'EMPTY_STATE' => 'No templates found',
            'TEMPLATE_PARSER' => [
                'BACK' => 'Go back',
                'SEND_MESSAGE' => 'Send message',
            ],
        ],
        'ACTION_BUTTONS' => [
            'DISCARD' => 'Discard',
            'SEND' => 'Send ({keyCode})',
        ],
    ],
];
