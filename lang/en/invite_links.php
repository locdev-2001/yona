<?php

return [
    'accept' => [
        'errors' => [
            'not_found' => 'This invite link does not exist.',
            'revoked' => 'This invite link has been revoked.',
            'expired' => 'This invite link has expired.',
            'exhausted' => 'This invite link has reached its usage limit.',
        ],
    ],

    'PAGE' => [
        'TITLE' => 'Invitation to join {account}',
        'ROLE_BADGE' => 'Role: {role}',
        'JOIN' => [
            'BUTTON' => 'Join now',
            'LOGGED_IN_AS' => 'You are signed in as {email}.',
        ],
        'SIGNUP' => [
            'TITLE' => 'Create an account to join {account}',
            'NAME' => [
                'LABEL' => 'Your name',
                'PLACEHOLDER' => 'Enter your display name',
            ],
            'EMAIL' => [
                'LABEL' => 'Email',
                'PLACEHOLDER' => 'Enter your email address',
                'ERROR' => 'Please enter a valid email address.',
            ],
            'PASSWORD' => [
                'LABEL' => 'Password',
                'PLACEHOLDER' => 'Set a login password',
            ],
            'SUBMIT' => 'Create account and join',
        ],
        'LOGIN_LINK' => 'Already have an account? Sign in first, then open this link again to join.',
        'BACK_HOME' => 'Back to homepage',
        'ERRORS' => [
            'NOT_FOUND' => [
                'TITLE' => 'Invite not found',
                'DESC' => 'This invite link does not exist. Ask the account admin to send a new one.',
            ],
            'REVOKED' => [
                'TITLE' => 'Invite revoked',
                'DESC' => 'The account admin has revoked this link. Ask for a new one.',
            ],
            'EXPIRED' => [
                'TITLE' => 'Invite expired',
                'DESC' => 'This invite link has expired. Ask the account admin to send a new one.',
            ],
            'EXHAUSTED' => [
                'TITLE' => 'Invite fully used',
                'DESC' => 'This invite link has reached its usage limit. Ask for a new one.',
            ],
        ],
        'API' => [
            'ERROR_MESSAGE' => 'Could not reach the server. Please try again later.',
        ],
    ],

    'MANAGE' => [
        'BUTTON' => 'Invite via link',
        'TITLE' => 'Invite via link',
        'DESC' => 'Create a link to send by hand over Zalo. The recipient creates an account, or joins with one click if they already have one.',
        'CLOSE' => 'Close',
        'FORM' => [
            'ROLE' => [
                'LABEL' => 'Role',
            ],
            'EXPIRES' => [
                'LABEL' => 'Expires in',
                'OPTIONS' => [
                    'DAY_1' => '1 day',
                    'DAY_7' => '7 days',
                    'DAY_30' => '30 days',
                ],
            ],
            'MAX_USES' => [
                'LABEL' => 'Limit number of uses',
                'PLACEHOLDER' => 'Leave blank for unlimited until it expires',
            ],
            'SUBMIT' => 'Create link',
        ],
        'CREATED' => [
            'TITLE' => 'Invite link created',
            'HINT' => 'This link only shows in full once. Copy or send it now.',
            'COPY' => 'Copy',
            'COPIED' => 'Copied',
            'SHARE_ZALO' => 'Send via Zalo',
        ],
        'LIST' => [
            'EMPTY' => 'No invite links yet.',
            'ROLE_LABEL' => '{role} role',
            'STATUS' => [
                'ACTIVE' => 'Active',
                'REVOKED' => 'Revoked',
                'EXPIRED' => 'Expired',
                'EXHAUSTED' => 'Fully used',
            ],
            'USES_UNLIMITED' => '{used} uses so far (unlimited)',
            'USES_LIMITED' => '{used}/{max} uses',
            'EXPIRES_AT' => 'Expires {date}',
            'CREATED_BY' => 'Created by {name}',
            'REVOKE' => [
                'BUTTON' => 'Revoke',
                'CONFIRM' => [
                    'TITLE' => 'Revoke invite link',
                    'MESSAGE' => 'This link will no longer work to join. Are you sure you want to revoke it?',
                    'YES' => 'Revoke',
                    'NO' => 'No, keep it',
                ],
            ],
        ],
        'API' => [
            'CREATE_SUCCESS' => 'Invite link created',
            'CREATE_ERROR' => 'Could not reach the server. Please try again later.',
            'REVOKE_SUCCESS' => 'Invite link revoked',
            'REVOKE_ERROR' => 'Could not reach the server. Please try again later.',
        ],
    ],
];
