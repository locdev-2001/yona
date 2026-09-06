<?php

// Nguồn: Chatwoot v4.17.1 app/javascript/survey/i18n/locale/en.json — chuỗi của
// trang khảo sát công khai `/survey/responses/{uuid}`.
// `POWERED_BY` nằm ở gốc bundle survey của bản gốc; ở đây gom vào namespace
// SURVEY vì mỗi file lang là một namespace (§17).

return [
    'DESCRIPTION' => 'Dear customer 👋, please take a few moments to share feedback about the conversation you had with {inboxName}.',
    'RATING' => [
        'LABEL' => 'Rate your conversation',
        'SUCCESS_MESSAGE' => 'Thank you for submitting the rating',
    ],
    'FEEDBACK' => [
        'LABEL' => 'Do you have any thoughts you\'d like to share?',
        'PLACEHOLDER' => 'Your feedback (optional)',
        'BUTTON_TEXT' => 'Submit feedback',
    ],
    'API' => [
        'SUCCESS_MESSAGE' => 'Survey updated successfully',
        'ERROR_MESSAGE' => 'Could not connect to Woot Server, Please try again later',
    ],
    'POWERED_BY' => 'Powered by Chatwoot',
];
