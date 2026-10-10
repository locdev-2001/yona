<?php

return [
    'CONTACT_SEARCH' => [
        'ERROR_MESSAGE' => 'We couldn’t complete the search. Please try again.',
    ],
    'CONTACT_CREATE' => [
        'ERROR_MESSAGE' => 'We couldn’t create the contact. Please try again.',
    ],
    'DRAFT' => [
        'TITLE' => 'New message',
        'EMPTY' => 'No messages yet. Pick a recipient and a channel, then write below.',
        'SENDING' => 'Opening the conversation and sending…',
        'COMPOSER_LOCKED' => 'Pick a recipient and a channel to start writing',
        'SUBJECT_LABEL' => 'Subject:',
        'NEW_CONTACT_BADGE' => 'New contact',
        'CREATE_CONTACT' => 'Create new contact: {address}',
        'CONTACT_LOAD_FAILED' => 'Could not load the contact. Please pick the recipient again.',
        'LOADING_CHANNELS' => 'Finding channels that can reach this person…',
        'LOAD_CHANNELS_FAILED' => 'Could not load the channels.',
        'RETRY' => 'Retry',
        'UNAVAILABLE' => [
            'MESSAGING_WINDOW_CLOSED' => 'The channel\'s reply window since the customer\'s last message has passed',
            'REAUTHORIZATION_REQUIRED' => 'The channel is disconnected and needs to sign in again',
            'OTHER' => 'This channel cannot reach this person right now',
        ],
        'EMAIL_CHECK' => [
            'CHECKING' => 'Checking the email address…',
            'INVALID_SYNTAX' => 'The email address is malformed — it cannot be sent to.',
            'DOMAIN_NOT_FOUND' => 'This address\'s domain does not exist — mail will not arrive.',
            'DOMAIN_NO_MAIL' => 'This address\'s domain does not accept mail — mail will not arrive.',
            'UNDELIVERABLE' => 'This email address cannot receive mail.',
        ],
        'ERRORS' => [
            'NO_RECIPIENT' => 'Pick a recipient before sending.',
            'NO_CHANNEL' => 'Pick a channel that can send before sending.',
            'EMAIL_CHECKING' => 'Still checking the email address, please wait a moment.',
            'EMAIL_UNDELIVERABLE' => 'This email address cannot receive mail, please check the recipient.',
            'SUBJECT_REQUIRED' => 'An email needs a subject.',
        ],
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
            'NO_RESULTS' => 'No contacts found',
            'CHANGE' => 'Change recipient',
        ],
        'INBOX_SELECTOR' => [
            'LABEL' => 'Via:',
            'PICK_CONTACT_FIRST' => 'Pick a recipient to see the inboxes that can reach them',
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
