<?php

// Namespace MFA_VERIFICATION; phần cài đặt 2FA ở mfa_settings.php
// (một file = một namespace).

return [
    'TITLE' => 'Two-Factor Authentication',
    'DESCRIPTION' => 'Enter your verification code to continue',
    'AUTHENTICATOR_APP' => 'Authenticator App',
    'BACKUP_CODE' => 'Backup Code',
    'ENTER_OTP_CODE' => 'Enter 6-digit code from your authenticator app',
    'ENTER_BACKUP_CODE' => 'Enter one of your backup codes',
    'BACKUP_CODE_PLACEHOLDER' => '000000',
    'VERIFY_BUTTON' => 'Verify',
    'TRY_ANOTHER_METHOD' => 'Try another verification method',
    'CANCEL_LOGIN' => 'Cancel and return to login',
    'HELP_TEXT' => 'Having trouble signing in?',
    'LEARN_MORE' => 'Learn more about 2FA',
    'HELP_MODAL' => [
        'TITLE' => 'Two-Factor Authentication Help',
        'AUTHENTICATOR_TITLE' => 'Using an Authenticator App',
        'AUTHENTICATOR_DESC' => 'Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code shown for your account.',
        'BACKUP_TITLE' => 'Using a Backup Code',
        'BACKUP_DESC' => 'If you don\'t have access to your authenticator app, you can use one of the backup codes you saved when setting up 2FA. Each code can only be used once.',
        'CONTACT_TITLE' => 'Need More Help?',
        'CONTACT_DESC_CLOUD' => 'If you\'ve lost access to both your authenticator app and backup codes, please reach out to {installationName} support for assistance.',
        'CONTACT_DESC_SELF_HOSTED' => 'If you\'ve lost access to both your authenticator app and backup codes, please contact your administrator for assistance.',
    ],
    'VERIFICATION_FAILED' => 'Verification failed. Please try again.',
];
