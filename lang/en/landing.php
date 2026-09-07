<?php

// Public landing page (`/`) — brought over from the `main` branch
// (lang/en/platform.php, `landing` block). Not part of upstream Chatwoot:
// Chatwoot sends visitors straight to the login screen, Yona keeps a product
// page at the domain root.
return [
    'nav' => [
        'features' => 'Features',
        'login' => 'Log in',
        'register' => 'Get started',
        'dashboard' => 'Go to dashboard',
        'back_to_home' => 'Back to home',
    ],
    'hero' => [
        'eyebrow' => 'Conversational CRM & Automation',
        'title' => 'Turn conversations into customers',
        'subtitle' => 'Bring every customer conversation from any messaging channel into one inbox — never miss a lead, automate follow-ups, close deals faster.',
        'cta_primary' => 'Get started free',
        'cta_secondary' => 'Log in',
        'cta_dashboard' => 'Go to dashboard',
        'hint' => 'No credit card required · Cancel anytime',
    ],
    'features' => [
        'title' => 'From conversation to closed deal',
        'subtitle' => 'Omnichannel inbox, CRM pipeline and care automation in one platform — your whole team in sync, realtime.',
        'inbox' => [
            'title' => 'Omnichannel inbox',
            'description' => 'Every customer message from every chat channel in one place — reply fast, never drop a conversation.',
        ],
        'crm' => [
            'title' => 'Conversations become customers',
            'description' => 'Turn a conversation into a Lead in one click and track it through a drag-and-drop pipeline to the close.',
        ],
        'automation' => [
            'title' => 'Care automation',
            'description' => 'Workflows send messages, create tasks and tag customers on script — every customer gets follow-up on time.',
        ],
        'teams' => [
            'title' => 'Teams & permissions',
            'description' => 'Multiple workspaces, record-level permissions and realtime updates for the whole team.',
        ],
    ],
    'footer' => [
        'tagline' => 'Conversational CRM & Automation for Vietnamese SMEs.',
        'copyright' => '© :year Yona. All rights reserved.',
    ],
    'appearance' => [
        'label' => 'Appearance',
        'light' => 'Light',
        'dark' => 'Dark',
        'auto' => 'System',
    ],
];
