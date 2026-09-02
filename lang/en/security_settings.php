<?php

// Nguồn: Chatwoot v4.17.1 dashboard/i18n/locale/en/settings.json — namespace SECURITY_SETTINGS.

return [
    'TITLE' => 'Security',
    'DESCRIPTION' => 'Manage your account security settings.',
    'LINK_TEXT' => 'Learn more about SAML SSO',
    'SAML_DISABLED_MESSAGE' => 'SAML SSO is currently disabled. Please contact your administrator to enable this feature.',
    'SAML' => [
        'TITLE' => 'SAML SSO',
        'NOTE' => 'Configure SAML single sign-on for your account. Users will authenticate through your identity provider instead of using email/password.',
        'ACS_URL' => [
            'LABEL' => 'ACS URL',
            'TOOLTIP' => 'Assertion Consumer Service URL - Configure this URL in your IdP as the destination for SAML responses',
        ],
        'SSO_URL' => [
            'LABEL' => 'SSO URL',
            'HELP' => 'The URL where SAML authentication requests will be sent',
            'PLACEHOLDER' => 'https://sso.example.com/saml/sso',
        ],
        'CERTIFICATE' => [
            'LABEL' => 'Signing certificate in PEM format',
            'HELP' => 'The public certificate from your identity provider used to verify SAML responses',
            'PLACEHOLDER' => '-----BEGIN CERTIFICATE-----
MIIC...',
        ],
        'FINGERPRINT' => [
            'LABEL' => 'Fingerprint',
            'TOOLTIP' => 'SHA-1 fingerprint of the certificate - Use this to verify the certificate in your IdP configuration',
        ],
        'COPY_SUCCESS' => 'Copied to clipboard',
        'SP_ENTITY_ID' => [
            'LABEL' => 'SP Entity ID',
            'HELP' => 'Unique identifier for this application as a service provider (auto-generated).',
            'TOOLTIP' => 'Unique identifier for Chatwoot as the Service Provider - Configure this in your IdP settings',
        ],
        'IDP_ENTITY_ID' => [
            'LABEL' => 'Identity Provider Entity ID',
            'HELP' => 'Unique identifier for your identity provider (usually found in IdP configuration)',
            'PLACEHOLDER' => 'https://sso.example.com/saml',
        ],
        'UPDATE_BUTTON' => 'Update SAML Settings',
        'API' => [
            'SUCCESS' => 'SAML settings updated successfully',
            'ERROR' => 'Failed to update SAML settings',
            'ERROR_LOADING' => 'Failed to load SAML settings',
            'DISABLED' => 'SAML settings disabled successfully',
        ],
        'VALIDATION' => [
            'REQUIRED_FIELDS' => 'SSO URL, Identity Provider Entity ID, and Certificate are required fields',
            'SSO_URL_ERROR' => 'Please enter a valid SSO URL',
            'CERTIFICATE_ERROR' => 'Certificate is required',
            'IDP_ENTITY_ID_ERROR' => 'Identity Provider Entity ID is required',
        ],
        'ENTERPRISE_PAYWALL' => [
            'AVAILABLE_ON' => 'The SAML SSO feature is only available in the Enterprise plans.',
            'UPGRADE_PROMPT' => 'Upgrade to an Enterprise plan to access SAML single sign-on and other advanced security features.',
            'ASK_ADMIN' => 'Please reach out to your administrator for the upgrade.',
        ],
        'PAYWALL' => [
            'TITLE' => 'Upgrade to enable SAML SSO',
            'AVAILABLE_ON' => 'The SAML SSO feature is only available in the Enterprise plans.',
            'UPGRADE_PROMPT' => 'Upgrade your plan to get access to SAML single sign-on and other advanced features.',
            'UPGRADE_NOW' => 'Upgrade now',
            'CANCEL_ANYTIME' => 'You can change or cancel your plan anytime',
        ],
        'ATTRIBUTE_MAPPING' => [
            'TITLE' => 'SAML Attribute Setup',
            'DESCRIPTION' => 'The following attribute mappings must be configured in your identity provider',
        ],
        'INFO_SECTION' => [
            'TITLE' => 'Service Provider Information',
            'TOOLTIP' => 'Copy these values and configure them in your Identity Provider to establish the SAML connection',
        ],
    ],
];
