<?php

// Hai nhóm khoá trong cùng namespace INTEGRATION_APPS:
//  - KHOÁ VIẾT HOA: chữ trên giao diện.
//  - khoá viết thường theo id ứng dụng: tên/mô tả từng ứng dụng, backend đọc qua
//    __('integration_apps.<id>.name').
// webhooks và dashboard_apps không có short_description.
return [
    'FETCHING' => 'Fetching Integrations',
    'NO_HOOK_CONFIGURED' => 'There are no {integrationId} integrations configured in this account.',
    'HEADER' => 'Applications',
    'COUNT' => '{n} integration | {n} integrations',
    'SEARCH_PLACEHOLDER' => 'Search...',
    'NO_RESULTS' => 'No results found matching your search',
    'STATUS' => [
        'ENABLED' => 'Enabled',
        'DISABLED' => 'Disabled',
    ],
    'CONFIGURE' => 'Configure',
    'ADD_BUTTON' => 'Add a new hook',
    'DELETE' => [
        'TITLE' => [
            'INBOX' => 'Confirm deletion',
            'ACCOUNT' => 'Disconnect',
        ],
        'MESSAGE' => [
            'INBOX' => 'Are you sure to delete?',
            'ACCOUNT' => 'Are you sure to disconnect?',
        ],
        'CONFIRM_BUTTON_TEXT' => [
            'INBOX' => 'Yes, Delete',
            'ACCOUNT' => 'Yes, Disconnect',
        ],
        'CANCEL_BUTTON_TEXT' => 'Cancel',
        'API' => [
            'SUCCESS_MESSAGE' => 'Hook deleted successfully',
            'ERROR_MESSAGE' => 'Could not connect to the server. Please try again later.',
        ],
    ],
    'LIST' => [
        'FETCHING' => 'Fetching integration hooks',
        'INBOX' => 'Inbox',
        'ACTIONS' => 'Actions',
        'DELETE' => [
            'BUTTON_TEXT' => 'Delete',
        ],
    ],
    'ADD' => [
        'FORM' => [
            'INBOX' => [
                'LABEL' => 'Select Inbox',
                'PLACEHOLDER' => 'Select Inbox',
            ],
            'SUBMIT' => 'Create',
            'VALIDATING_OPENAI' => 'Validating with OpenAI...',
            'CANCEL' => 'Cancel',
        ],
        'API' => [
            'SUCCESS_MESSAGE' => 'Integration hook added successfully',
            'ERROR_MESSAGE' => 'Could not connect to the server. Please try again later.',
        ],
    ],
    'CONNECT' => [
        'BUTTON_TEXT' => 'Connect',
    ],
    'DISCONNECT' => [
        'BUTTON_TEXT' => 'Disconnect',
    ],
    'SIDEBAR_DESCRIPTION' => [
        'DIALOGFLOW' => 'Dialogflow is a natural language processing platform for building conversational interfaces. Integrating it with {installationName} lets bots handle queries first and transfer them to agents when needed. It helps qualify leads and reduce agent workload by answering FAQs. To add Dialogflow, create a Service Account in Google Console and share the credentials. Refer to the docs for details',
    ],
    'dashboard_apps' => [
        'name' => 'Dashboard Apps',
        'description' => 'Dashboard Apps allow you to create and embed applications that display user information, orders, or payment history, providing more context to your customer support agents.',
    ],
    'dyte' => [
        'name' => 'Cloudflare RealtimeKit',
        'short_description' => 'Start video/voice calls with customers directly from {installationName}.',
        'description' => 'Cloudflare RealtimeKit lets your agents start video/voice calls with your customers directly from {installationName}.',
        'meeting_name' => ':agent_name has started a meeting',
    ],
    'slack' => [
        'name' => 'Slack',
        'short_description' => 'Receive notifications and respond to conversations directly in Slack.',
        'description' => "Integrate {installationName} with Slack to keep your team in sync. This integration allows you to receive notifications for new conversations and respond to them directly within Slack's interface.",
    ],
    'webhooks' => [
        'name' => 'Webhooks',
        'description' => 'Webhook events provide real-time updates about activities in your {installationName} account. You can subscribe to your preferred events, and {installationName} will send you HTTP callbacks with the updates.',
    ],
    'dialogflow' => [
        'name' => 'Dialogflow',
        'short_description' => 'Build chatbots to handle initial queries before transferring to agents.',
        'description' => 'Build chatbots with Dialogflow and easily integrate them into your inbox. These bots can handle initial queries before transferring them to a customer service agent.',
    ],
    'google_translate' => [
        'name' => 'Google Translate',
        'short_description' => 'Automatically translate customer messages for agents.',
        'description' => "Integrate Google Translate to help agents easily translate customer messages. This integration automatically detects the language and converts it to the agent's or admin's preferred language.",
    ],
    'openai' => [
        'name' => 'OpenAI',
        'short_description' => 'AI-powered reply suggestions, summarization, and message enhancement.',
        'description' => 'Leverage the power of large language models from OpenAI with the features such as reply suggestions, summarization, message rephrasing, spell-checking, and label classification.',
    ],
    'linear' => [
        'name' => 'Linear',
        'short_description' => 'Create and link Linear issues directly from conversations.',
        'description' => 'Create issues in Linear directly from your conversation window. Alternatively, link existing Linear issues for a more streamlined and efficient issue tracking process.',
    ],
    'notion' => [
        'name' => 'Notion',
        'short_description' => 'Integrate databases, documents and pages directly with Captain.',
        'description' => 'Connect your Notion workspace to enable Captain to access and generate intelligent responses using content from your databases, documents, and pages to provide more contextual customer support.',
    ],
    'shopify' => [
        'name' => 'Shopify',
        'short_description' => 'Access order details and customer data from your Shopify store.',
        'description' => 'Connect your Shopify store to access order details, customer information, and product data directly within your conversations and helps your support team provide faster, more contextual assistance to your customers.',
    ],
    'leadsquared' => [
        'name' => 'LeadSquared',
        'short_description' => 'Sync your contacts and conversations with LeadSquared CRM.',
        'description' => 'Sync your contacts and conversations with LeadSquared CRM. This integration automatically creates leads in LeadSquared when new contacts are added, and logs conversation activity to provide your sales team with complete context.',
    ],
];
