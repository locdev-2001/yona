<?php

return [
    'meta' => [
        'title' => 'Yona · Conversational CRM for Vietnamese SMEs',
        'description' => 'Bring customer messages from Zalo, Messenger and TikTok into one inbox. Turn conversations into customers and automate the follow-up.',
    ],

    'nav' => [
        'features' => 'Features',
        'pricing' => 'Pricing',
        'login' => 'Log in',
        'register' => 'Try it free',
        'dashboard' => 'Go to dashboard',
        'back_to_home' => 'Back to home',
        'language' => 'Language',
    ],

    'cta' => [
        'primary' => 'Try it free',
        'secondary' => 'See the inbox',
        'learn' => 'Learn more',
    ],

    'hero' => [
        'title_lead' => 'Every customer message',
        'title_focus' => 'in one inbox',
        'title_tail' => 'and closed faster',
        'subtitle' => 'Yona is a CRM with conversation as the front door. Zalo, Messenger or your website, it all lands in one place and becomes a customer record.',
        'cta_primary' => 'Try it free',
        'cta_secondary' => 'Log in',
        'fine' => 'Free while we finish building. No credit card required.',
        'cta_dashboard' => 'Go to dashboard',
    ],

    'showcase' => [
        'title_lead' => 'Two sides,',
        'title_focus' => 'one flow of data',
        'tabs' => [
            'inbox' => 'Conversation inbox',
            'records' => 'Customer records',
        ],
    ],

    'channels' => [
        'eyebrow' => 'Wherever they message, Yona picks it up',
        'note' => 'A new channel is a new driver, not a rebuild.',
    ],

    'features' => [
        'inbox' => [
            'eyebrow' => 'Conversation inbox',
            'title_a' => 'One inbox for the team,',
            'title_b' => 'every channel in it',
            'body' => 'Zalo, Messenger and your website land in the same list. The whole team sees the same conversation in real time, so nobody answers twice and nothing slips.',
            'cards' => [
                'collision' => [
                    'title' => 'Nobody answers twice',
                    'body' => 'You see it the moment a teammate opens a conversation. Assign work and talk to each other in private notes the customer never reads.',
                ],
                'history' => [
                    'title' => 'History sits next to the message',
                    'body' => 'Labels, notes, owner and every earlier exchange are on one screen. No second app to open.',
                ],
                'mobile' => [
                    'title' => 'Answer from your phone',
                    'body' => 'The layout folds down to a small screen without losing a step. Close deals while you are out.',
                ],
            ],
        ],

        'zalo' => [
            'eyebrow' => 'Personal Zalo',
            'title_a' => 'The channel other CRMs',
            'title_b' => 'leave out',
            'body' => 'Most Vietnamese SMEs sell through personal Zalo, not an Official Account. Yona takes both, and personal Zalo messages land in the same inbox as everything else.',
            'cards' => [
                'qr' => [
                    'title' => 'Connect by scanning a QR code',
                    'body' => 'Open Yona, scan, done. No Official Account approval to wait for, no business licence required.',
                ],
                'filter' => [
                    'title' => 'Filter before anything is stored',
                    'body' => 'You choose which conversations enter the CRM. Private threads stay out of company data.',
                ],
                'key' => [
                    'title' => 'The phone number is the key',
                    'body' => 'The same number on Zalo and Messenger merges into one record instead of splitting into two customers.',
                ],
            ],
        ],

        'crm' => [
            'eyebrow' => 'Records and pipeline',
            'title_a' => 'Conversations become',
            'title_b' => 'customer records',
            'body' => 'A first-time stranger becomes a draft contact, tagged with the channel it came from. Confirm real intent and one tap turns it into a lead at the right pipeline stage.',
            'cards' => [
                'draft' => [
                    'title' => 'A stranger is not a lead yet',
                    'body' => 'Anyone who messages becomes a draft contact. Only confirmed intent enters the pipeline, so the numbers stay honest.',
                ],
                'source' => [
                    'title' => 'Always know where they came from',
                    'body' => 'Every record names its first channel. Knowing which channel closes deals is how you know where to spend effort.',
                ],
                'respect' => [
                    'title' => 'Respect the law and the recipient',
                    'body' => 'Send only between 7am and 10pm, at most three promotional messages per number per day, always with a way out.',
                ],
            ],
        ],
    ],

    'flow' => [
        'eyebrow' => 'The conversation lifecycle',
        'title' => 'From message to closed deal',
        'subtitle' => 'A conversation runs its whole life inside one system, without being copied by hand into another.',
        'steps' => [
            'capture' => ['title' => 'Capture', 'description' => 'They message. The system creates a draft contact and records which channel it came from.'],
            'qualify' => ['title' => 'Qualify', 'description' => 'Real intent turns it into a lead in one click, at the right pipeline stage.'],
            'nurture' => ['title' => 'Nurture', 'description' => 'Workflows send messages, create todos and apply labels on the script you set.'],
            'close' => ['title' => 'Close', 'description' => 'Drag through the stages until they become a customer.'],
        ],
    ],

    'rules' => [
        'eyebrow' => 'Built for Vietnam',
        'title' => 'Four things we do not compromise on',
        'items' => [
            'dedupe' => [
                'title' => 'One person, one record',
                'description' => 'The same phone number becomes one record, whether they arrive on Zalo today and Messenger next month.',
            ],
            'draft' => [
                'title' => 'A stranger is not a lead yet',
                'description' => 'Anyone who messages becomes a draft contact. Only confirmed intent enters the pipeline, so the numbers stay honest.',
            ],
            'source' => [
                'title' => 'Always know where they came from',
                'description' => 'Every record names its first channel. Knowing which channel closes deals is how you know where to spend effort.',
            ],
            'respect' => [
                'title' => 'Respect the law and the recipient',
                'description' => 'Send only between 7am and 10pm, at most three promotional messages per number per day, always with a way out.',
            ],
        ],
    ],

    'pricing' => [
        'title' => 'Right now it is unlimited',
        'subtitle' => 'Yona is still being finished. We count conversations to shape a pricing policy later, but nothing is capped today.',
        'plan' => 'While we finish building',
        'price' => '0₫',
        'unit' => 'per month',
        'points' => [
            'unlimited' => 'No cap on conversations, channels or team members',
            'no_card' => 'No credit card required',
            'notice' => 'When paid plans arrive, we tell you first',
        ],
        'cta' => 'Get started',
        'fine' => 'The conversation counter still runs so we understand how you use Yona, but no limit is being enforced.',
    ],

    'closing' => [
        'title' => 'Try it with your own messages',
        'cta_primary' => 'Try it free',
        'cta_secondary' => 'Log in',
    ],

    'footer' => [
        'tagline' => 'Conversational CRM and automation for Vietnamese SMEs.',
        'copyright' => '© :year Yona. All rights reserved.',
        'product' => 'Product',
        'account' => 'Account',
        'language' => 'Language',
        'note' => 'Built in Vietnam, for the Vietnamese market.',
    ],
];
