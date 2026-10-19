<?php

return [
    'FORM' => [
        'SUBMIT' => 'Submit',
        'CANCEL' => 'Cancel',
        'AVATAR' => [
            'LABEL' => 'Avatar',
        ],
        'NAME' => [
            'PLACEHOLDER' => 'Enter the full name',
            'LABEL' => 'Full Name',
        ],
        'BIO' => [
            'PLACEHOLDER' => 'Enter a short bio',
            'LABEL' => 'Bio',
        ],
        'EMAIL_ADDRESS' => [
            'PLACEHOLDER' => 'Enter the email address',
            'LABEL' => 'Email Address',
            'DUPLICATE' => 'This email address already belongs to another profile.',
            'ERROR' => 'Please enter a valid email address.',
        ],
        'PHONE_NUMBER' => [
            'PLACEHOLDER' => 'Enter the phone number',
            'LABEL' => 'Phone Number',
            'HELP' => 'Phone number should be of E.164 format eg: +1415555555 [+][country code][area code][local phone number]. You can select the dial code from the dropdown.',
            'ERROR' => 'Phone number should be either empty or of E.164 format',
            'DIAL_CODE_ERROR' => 'Please select a dial code from the list',
            'DUPLICATE' => 'This phone number already belongs to another profile.',
        ],
        'LOCATION' => [
            'PLACEHOLDER' => 'Enter the location',
            'LABEL' => 'Location',
        ],
        'COMPANY_NAME' => [
            'PLACEHOLDER' => 'Enter the company name',
            'LABEL' => 'Company Name',
        ],
        'COUNTRY' => [
            'PLACEHOLDER' => 'Enter the country name',
            'LABEL' => 'Country Name',
            'SELECT_PLACEHOLDER' => 'Select',
            'REMOVE' => 'Remove',
            'SELECT_COUNTRY' => 'Select Country',
        ],
        'CITY' => [
            'PLACEHOLDER' => 'Enter the city name',
            'LABEL' => 'City Name',
        ],
        'SOCIAL_PROFILES' => [
            'FACEBOOK' => [
                'PLACEHOLDER' => 'Enter the Facebook username',
                'LABEL' => 'Facebook',
            ],
            'TWITTER' => [
                'PLACEHOLDER' => 'Enter the Twitter username',
                'LABEL' => 'Twitter',
            ],
            'LINKEDIN' => [
                'PLACEHOLDER' => 'Enter the LinkedIn username',
                'LABEL' => 'LinkedIn',
            ],
            'GITHUB' => [
                'PLACEHOLDER' => 'Enter the Github username',
                'LABEL' => 'Github',
            ],
        ],
    ],
    'DELETE_AVATAR' => [
        'API' => [
            'SUCCESS_MESSAGE' => 'Avatar deleted',
            'ERROR_MESSAGE' => 'Could not delete the avatar. Please try again later.',
        ],
    ],
    'SUCCESS_MESSAGE' => 'Saved successfully',
    'ERROR_MESSAGE' => 'There was an error, please try again',
];
