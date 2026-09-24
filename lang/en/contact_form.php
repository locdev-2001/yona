<?php

return [
    'FORM' => [
        'SUBMIT' => 'Submit',
        'CANCEL' => 'Cancel',
        'AVATAR' => [
            'LABEL' => 'Contact Avatar',
        ],
        'NAME' => [
            'PLACEHOLDER' => 'Enter the full name of the contact',
            'LABEL' => 'Full Name',
        ],
        'BIO' => [
            'PLACEHOLDER' => 'Enter the bio of the contact',
            'LABEL' => 'Bio',
        ],
        'EMAIL_ADDRESS' => [
            'PLACEHOLDER' => 'Enter the email address of the contact',
            'LABEL' => 'Email Address',
            'DUPLICATE' => 'This email address is in use for another contact.',
            'ERROR' => 'Please enter a valid email address.',
        ],
        'PHONE_NUMBER' => [
            'PLACEHOLDER' => 'Enter the phone number of the contact',
            'LABEL' => 'Phone Number',
            'HELP' => 'Phone number should be of E.164 format eg: +1415555555 [+][country code][area code][local phone number]. You can select the dial code from the dropdown.',
            'ERROR' => 'Phone number should be either empty or of E.164 format',
            'DIAL_CODE_ERROR' => 'Please select a dial code from the list',
            'DUPLICATE' => 'This phone number is in use for another contact.',
        ],
        'LOCATION' => [
            'PLACEHOLDER' => 'Enter the location of the contact',
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
            'SUCCESS_MESSAGE' => 'Contact avatar deleted successfully',
            'ERROR_MESSAGE' => 'Could not delete the contact avatar. Please try again later.',
        ],
    ],
    'SUCCESS_MESSAGE' => 'Contact saved successfully',
    'ERROR_MESSAGE' => 'There was an error, please try again',
];
