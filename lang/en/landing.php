<?php

return [
    'meta' => [
        'title' => 'Yona · Conversational CRM for Vietnamese SMEs',
        'description' => 'Bring customer messages from personal Zalo, your website and email into one inbox. Turn conversations into customer records, then label and assign them automatically by rule.',
    ],

    'nav' => [
        'features' => 'Features',
        'pricing' => 'Pricing',
        'login' => 'Log in',
        'register' => 'Try it free',
        'dashboard' => 'Go to dashboard',
        'back_to_home' => 'Back to home',
        'language' => 'Language',
        'menu' => 'Menu',
        'menu_close' => 'Close menu',
        'demo' => 'Book a demo',
        'zalo' => 'Personal Zalo',
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
        'subtitle' => 'Yona is a CRM with conversation as the front door. Zalo, your website or email, it all lands in one place and becomes a customer record.',
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
        'coming_soon' => 'Coming soon: :channels.',
        'note' => 'A new channel is a new driver, not a rebuild.',
    ],

    'features' => [
        'inbox' => [
            'eyebrow' => 'Conversation inbox',
            'title_a' => 'One inbox for the team,',
            'title_b' => 'every channel in it',
            'body' => 'Zalo, your website and email land in the same list. The whole team sees the same conversation in real time, so nobody answers twice and nothing slips.',
            'cards' => [
                'collision' => [
                    'title' => 'Nobody answers twice',
                    'body' => 'You see it the moment a teammate starts typing a reply. Assign the conversation to the right person and talk to each other in private notes the customer never reads.',
                ],
                'history' => [
                    'title' => 'History sits next to the message',
                    'body' => 'Labels, notes, owner and every earlier exchange are on one screen. No second app to open.',
                ],
                'mobile' => [
                    'title' => 'Answer from your phone',
                    'body' => 'The layout folds down to a small screen without losing a step. Close a sale while you are out.',
                ],
            ],
        ],

        'zalo' => [
            'eyebrow' => 'Personal Zalo',
            'title_a' => 'The channel many CRMs',
            'title_b' => 'leave out',
            'body' => 'Most Vietnamese SMEs sell through personal Zalo, not an Official Account. Yona connects to personal Zalo directly, and those messages land in the same inbox as everything else.',
            'cards' => [
                'qr' => [
                    'title' => 'Connect by scanning a QR code',
                    'body' => 'Open Yona, scan, done. No Official Account approval to wait for, no business licence required.',
                ],
                'reply' => [
                    'title' => 'Reply in Yona, they get it on Zalo',
                    'body' => 'What you send from the inbox goes out from the Zalo account you already sell on. Recalls and reactions travel both ways too.',
                ],
                'key' => [
                    'title' => 'The phone number is the key',
                    'body' => 'The same number on Zalo and on your website merges into one record instead of splitting into two customers.',
                ],
            ],
        ],

        'crm' => [
            'eyebrow' => 'Customer records',
            'title_a' => 'Conversations become',
            'title_b' => 'customer records',
            'body' => 'Everyone who messages gets a record, with every earlier exchange and the channels they used. Labels, notes and your own attributes sit in the same place.',
            'cards' => [
                'draft' => [
                    'title' => 'A stranger is not on the list yet',
                    'body' => 'Someone who messages without a phone number or email is a draft contact. They join the contact list once there is a number or an email, so the list stays honest.',
                ],
                'source' => [
                    'title' => 'Always know where they came from',
                    'body' => 'Every conversation names the channel it came from. Reports per channel show which one brings the most customers, so you know where to spend effort.',
                ],
                'attributes' => [
                    'title' => 'Fields that fit your business',
                    'body' => 'Add custom attributes such as size, birthday or order code, then filter the contact list by exactly those fields. Import and export CSV when you need to.',
                ],
            ],
        ],
    ],

    'flow' => [
        'eyebrow' => 'The conversation lifecycle',
        'title' => 'From first message to resolved',
        'subtitle' => 'A conversation runs its whole life inside one system, without being copied by hand into another.',
        'steps' => [
            'capture' => ['title' => 'Capture', 'description' => 'They message. The system creates a record and notes which channel the conversation came from.'],
            'assign' => ['title' => 'Assign', 'description' => 'Rules label the conversation and hand it to the right person or team, on conditions you set.'],
            'reply' => ['title' => 'Reply', 'description' => 'Canned responses and macros handle the repeat questions. Need a teammate? Mention them in a private note.'],
            'resolve' => ['title' => 'Resolve', 'description' => 'Mark it resolved, invite the customer to rate the service, and see in reports how fast the team answers.'],
        ],
    ],

    'rules' => [
        'eyebrow' => 'Built for Vietnam',
        'title' => 'Four things we do not compromise on',
        'items' => [
            'dedupe' => [
                'title' => 'One person, one record',
                'description' => 'The same phone number becomes one record, whether they arrive on Zalo today or your website next month.',
            ],
            'draft' => [
                'title' => 'A stranger is not on the list yet',
                'description' => 'Everyone who messages gets a record, but without a phone number or email they stay a draft contact, off the contact list. So the numbers stay honest.',
            ],
            'source' => [
                'title' => 'Always know where they came from',
                'description' => 'Every conversation names the channel it came from. Knowing which channel brings customers is how you know where to spend effort.',
            ],
            'inbound' => [
                'title' => 'No customer message dropped',
                'description' => 'No usage limit blocks incoming messages or new conversations. However much you use Yona, customer messages still reach the inbox.',
            ],
        ],
    ],

    'pricing' => [
        'title' => 'Right now it is unlimited',
        'subtitle' => 'Yona is still being finished. There are no paid plans yet, so nothing is locked behind one.',
        'plan' => 'While we finish building',
        'price' => '0₫',
        'unit' => 'per month',
        'points' => [
            'unlimited' => 'No cap on conversations, channels or team members',
            'no_card' => 'No credit card required',
            'notice' => 'When paid plans arrive, we tell you first',
        ],
        'cta' => 'Get started',
        'fine' => 'No limit is being enforced. Your contact list exports to CSV whenever you want, because the data is yours.',
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

    'demo' => [
        'meta' => [
            'title' => 'Book a Yona demo · 15 minutes, Zalo connected on the call',
            'description' => 'Leave your name and phone number and we call back during business hours. A 15 minute call, with your Zalo connected on the spot.',
        ],
        'eyebrow' => 'Book a demo',
        'title' => 'Leave your number, we call back',
        'lead' => 'One 15 minute call. We connect your Zalo account during the call, with nothing to install beforehand.',
        'promise' => [
            'connect' => 'We scan the QR code on the call, so you watch real messages land in the inbox.',
            'fit' => 'We say plainly what Yona does and what it does not do yet.',
            'callback' => 'We call back during business hours, 8am to 6pm on weekdays.',
        ],
        'form' => [
            'legend' => 'Contact details',
            'name_label' => 'Your name',
            'name_placeholder' => 'For example: Tran Thu Ha',
            'phone_label' => 'Phone number',
            'phone_placeholder' => '0912 345 678',
            'phone_hint' => 'A number that also has Zalo works best, we message before calling.',
            'phone_invalid' => 'That phone number is not valid. Use 0912345678 or +84912345678.',
            'note_label' => 'What you sell and where it hurts (optional)',
            'note_placeholder' => 'For example: a cosmetics shop, three people answering one Zalo account, duplicate customers.',
            'honeypot_label' => 'Website',
            'submit' => 'Send and wait for our call',
            'required_note' => 'Fields marked * are required.',
            'privacy' => 'We use your number to contact you about Yona. We do not sell it and do not add it to any marketing list.',
            'failed' => 'Sending failed. Try again, or use the Zalo and hotline buttons below, both reach the same people.',
        ],
        'alt' => [
            'title' => 'Rather message us now than wait for a call',
            'hotline' => 'Call the hotline',
            'zalo' => 'Message on Zalo',
            'note' => 'You can also use the chat bubble in the corner. That is Yona running in production.',
        ],
        'thanks' => [
            'meta' => [
                'title' => 'Demo request received · Yona',
                'description' => 'We have your details and will call back during business hours.',
            ],
            'eyebrow' => 'Received',
            'title' => 'Got it. We call back during business hours.',
            'lead' => 'Your request is now in our inbox, next to real customer messages. No need to send it again.',
            'next' => [
                'when' => 'During business hours, 8am to 6pm on weekdays.',
                'how' => 'We send a Zalo message first so you know who is calling.',
                'prepare' => 'All you need is a phone with Zalo logged in.',
            ],
            'cta_home' => 'Back to home',
            'cta_zalo' => 'See what Yona does with personal Zalo',
        ],
    ],

    'zalo_page' => [
        'meta' => [
            'title' => 'Manage personal Zalo customers · Yona',
            'description' => 'Bring your team personal Zalo messages into one shared inbox. Scan a QR code once, customers become records, the phone number is the dedupe key.',
        ],
        'hero' => [
            'eyebrow' => 'Personal Zalo',
            'title_a' => 'Sell on personal Zalo,',
            'title_b' => 'run it like an inbox',
            'lead' => 'Scan a QR code once. Customer messages from personal Zalo land in a shared inbox everyone can see, and each customer becomes a record.',
            'cta_primary' => 'Book a demo',
            'cta_secondary' => 'See other channels',
        ],
        'problem' => [
            'eyebrow' => 'The problem',
            'title' => 'Personal Zalo sells well but cannot be managed',
            'items' => [
                'mixed' => [
                    'title' => 'Customer chats mixed with private ones',
                    'description' => 'Orders sit between family chats and group threads. Finding a conversation from three days ago means scrolling.',
                ],
                'shared' => [
                    'title' => 'Several people, one phone',
                    'description' => 'The team shares one handset to reply. Whoever holds it, everyone else waits.',
                ],
                'blind' => [
                    'title' => 'Nobody knows who replied',
                    'description' => 'Two people answer the same customer differently, or nobody answers because each assumed the other did.',
                ],
                'lost' => [
                    'title' => 'Customers disappear without a trace',
                    'description' => 'Someone asks the price then goes quiet. Nothing records it for a follow up, so that customer is gone.',
                ],
            ],
        ],
        'solution' => [
            'eyebrow' => 'How Yona solves it',
            'title_a' => 'One QR scan,',
            'title_b' => 'one inbox for the whole team',
            'body' => 'Yona connects to the exact Zalo account you already sell on. No new number, no asking customers to add anyone. Messages still live in Zalo, with a copy in the inbox so the team can see them.',
            'cards' => [
                'qr' => [
                    'title' => 'Scan a QR code once',
                    'body' => 'Log in with a QR code, the same way you open Zalo on a desktop. Nothing to register with Zalo.',
                ],
                'shared' => [
                    'title' => 'A shared inbox',
                    'body' => 'Each person gets their own Yona account and they all see one conversation list, including who is replying to whom.',
                ],
                'draft' => [
                    'title' => 'Strangers stay draft contacts',
                    'body' => 'A first time sender with no phone number or email stays off the contact list. Once there is a number, from their Zalo profile or typed in by you, they are on it.',
                ],
                'dedupe' => [
                    'title' => 'Phone number prevents duplicates',
                    'body' => 'The same person writing on Zalo and on the website still merges into one record, because the key is the phone number.',
                ],
            ],
        ],
        'caps' => [
            'eyebrow' => 'Actually works',
            'title' => 'What Yona does on personal Zalo',
            'note' => 'This list is what ships today, not a roadmap.',
            'items' => [
                'recall' => [
                    'title' => 'Two way message recall',
                    'description' => 'Unsend in Yona and it disappears in Zalo, and the other way round.',
                ],
                'reaction' => [
                    'title' => 'Reactions',
                    'description' => 'Reactions from customers show in the inbox, and you can react back from Yona.',
                ],
                'group' => [
                    'title' => 'Group messages name the sender',
                    'description' => 'In a busy group you still see who wrote what, without guessing by turn.',
                ],
                'rich' => [
                    'title' => 'Location, contact cards, bank cards',
                    'description' => 'What customers attach renders as itself instead of an empty line of text.',
                ],
            ],
        ],
        'risk' => [
            'eyebrow' => 'Said upfront',
            'title' => 'Personal Zalo has no official API',
            'body' => 'We say this plainly so you decide with full information, instead of finding out after moving your work over.',
            'points' => [
                'unofficial' => 'The connection uses an unofficial path. Zalo can change how it works at any time and the connection will break.',
                'ban' => 'A Zalo account can be limited or locked. That risk is real and nobody can remove it.',
                'keep' => 'Messages already in Yona stay in the inbox and in the customer records, even if the connection stops.',
                'oa' => 'If you need an official channel that is stable long term, Zalo OA is the right road. Yona does not connect to Zalo OA today.',
            ],
        ],
        'closing' => [
            'title' => 'See it with your own Zalo messages',
            'lead' => 'One 15 minute call. We scan the QR code during the call so you watch real messages arrive.',
            'cta_primary' => 'Book a demo',
            'cta_secondary' => 'Back to home',
        ],
    ],
];
