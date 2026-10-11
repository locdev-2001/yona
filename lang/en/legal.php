<?php

// Public legal pages (/dieu-khoan, /chinh-sach-rieng-tu) and the Legal column
// in the footer. Every sentence about how Yona handles data must match the code
// that is running: change the software's behaviour, change the sentence here.
// Legal entity details (name, address, tax code, email) are not in the repo yet,
// so they are left out on purpose.

return [
    'nav' => [
        'heading' => 'Legal',
        'terms' => 'Terms of use',
        'privacy' => 'Privacy policy',
    ],

    'eyebrow' => 'Legal',
    'updated' => 'Last updated: :date',
    'related' => 'Read alongside',

    'terms' => [
        'meta' => [
            'title' => 'Terms of use · Yona',
            'description' => 'The terms for using Yona: what the service covers before paid plans exist, the risks of the personal Zalo channel, your data and what the Yona team can access.',
        ],
        'title' => 'Terms of use',
        'updated_on' => '24 September 2026',
        'lead' => 'These terms apply when you create an account and use Yona. We keep them short and state the current limits plainly, so you can decide with the full picture.',
        'sections' => [
            'service' => [
                'heading' => '1. What Yona is',
                'body' => [
                    'what' => 'Yona is web software. It brings customer messages from several chat channels into one inbox shared by the whole team, and keeps each sender as a contact record.',
                    'channels' => 'The channels you can use are the ones you can select when creating a new inbox, such as personal Zalo, the website chat and email. A channel that cannot be selected yet, or is still marked "Coming soon", is not available and is not promised by these terms.',
                ],
            ],
            'account' => [
                'heading' => '2. Accounts and members',
                'points' => [
                    'owner' => 'The person who creates the account is its administrator and can invite members, assign roles and connect channels.',
                    'password' => 'You keep your password safe and are responsible for actions taken under your account. We recommend turning on two-factor authentication in your Profile.',
                    'members' => 'Administrators are responsible for the people they invite into the account.',
                ],
            ],
            'free_phase' => [
                'heading' => '3. Before paid plans',
                'body' => [
                    'now' => 'Yona is still being finished. There is no paid plan yet: no limit on conversations, channels or members, and no card required.',
                ],
                'points' => [
                    'no_payment' => 'Yona has no payment feature yet, so it stores no card or bank details of yours.',
                    'notice' => 'When paid plans arrive, we will tell the administrator of every account in advance.',
                    'changes' => 'During this period features may change, and the service may be briefly unavailable while we update it.',
                ],
            ],
            'zalo' => [
                'heading' => '4. The personal Zalo channel and its risks',
                'body' => [
                    'how' => 'Zalo has no official API for personal accounts. Yona connects by signing in to your Zalo account through a QR code, using an unofficial open source library (zca-js).',
                ],
                'points' => [
                    'unofficial' => 'Zalo can change how it works at any time. When it does, the connection stops until Yona catches up.',
                    'ban' => 'A Zalo account can be restricted or locked. This risk is real, and neither you nor Yona can remove it.',
                    'tos' => 'Using an unofficial tool may go against Zalo\'s own terms of use. You decide whether to connect an account at all.',
                    'session' => 'The Zalo sign-in session is stored on Yona\'s server to keep the connection alive. How it is stored is explained in the Privacy policy.',
                    'keep' => 'Messages already in Yona stay in the inbox and the customer record, even after the connection stops.',
                    'oa' => 'If you need an official channel that stays stable long term, Zalo OA is the right route. Yona does not connect to Zalo OA yet.',
                ],
            ],
            'acceptable_use' => [
                'heading' => '5. Acceptable use',
                'body' => [
                    'intro' => 'You use Yona to talk with your own customers. You must not:',
                ],
                'points' => [
                    'spam' => 'send spam or advertising to people who have not agreed to receive it, or use Yona against Vietnamese law on advertising and spam messages;',
                    'personal_data' => 'collect or use your customers\' personal data against Vietnamese law on personal data protection;',
                    'unlawful' => 'spread unlawful content, scams or malware through messages and attachments;',
                    'abuse' => 'try to reach another account\'s data, or overload the system.',
                ],
                'note' => 'You must also follow the terms of every platform you connect, such as Zalo or your email provider.',
            ],
            'data' => [
                'heading' => '6. Your data',
                'points' => [
                    'ownership' => 'The messages, contact records and files you bring into Yona are yours. Yona processes them to run the service for you, as described in the Privacy policy.',
                    'export' => 'You can export your contact list and reports to CSV inside the app at any time.',
                    'not_yet' => 'There is no self-service export of all conversations and no self-service account deletion yet. If you need either, message us as described under Contact.',
                ],
            ],
            'yona_access' => [
                'heading' => '7. What the Yona team can access',
                'body' => [
                    'what' => 'The Yona operations team has a system administrator account. It can list accounts and users, and it can sign in as a user to help or to fix a problem. When it does, the Yona team member sees exactly what that user sees, conversations included.',
                    'when' => 'We only use this when we need to help you or fix a problem.',
                ],
            ],
            'termination' => [
                'heading' => '8. Suspension and ending',
                'points' => [
                    'by_you' => 'You can stop using Yona at any time: disconnect channels, delete inboxes and contacts inside the app, and message us if you want the whole account deleted.',
                    'by_yona' => 'Yona may suspend an account used against section 5, and will tell that account\'s administrator.',
                ],
            ],
            'liability' => [
                'heading' => '9. Limitation of liability',
                'points' => [
                    'as_is' => 'While it is being finished, Yona is provided as is. We work to keep the service stable but do not commit to an uptime level yet.',
                    'platforms' => 'Yona is not responsible when Zalo or another third-party platform restricts or locks your account, or changes how it works.',
                    'law' => 'These terms are read and applied under Vietnamese law.',
                ],
            ],
            'changes' => [
                'heading' => '10. Changes to these terms',
                'body' => [
                    'how' => 'When the terms change, we update the date at the top of this page. Changes that affect your rights are announced in advance to account administrators.',
                ],
            ],
            'contact' => [
                'heading' => '11. Contact',
                'body' => [
                    'how' => 'Message us through the chat in the bottom corner of any yona.vn page, or leave your phone number on the Book a demo page. Both go straight into the Yona team\'s inbox.',
                ],
            ],
        ],
    ],

    'privacy' => [
        'meta' => [
            'title' => 'Privacy policy · Yona',
            'description' => 'What Yona stores, why, who can see it, which third parties take part and what rights you have over your data.',
        ],
        'title' => 'Privacy policy',
        'updated_on' => '11 October 2026',
        'lead' => 'This policy explains what Yona stores, what it is used for, who can see it and what rights you have. Everything here describes how the software works today, including where it still falls short.',
        'sections' => [
            'roles' => [
                'heading' => '1. Yona\'s two roles',
                'points' => [
                    'account' => 'For your account data and your team members\' data, such as names, emails and passwords, Yona decides how it is processed and is directly responsible.',
                    'customers' => 'For the customer data you bring into Yona, such as messages, contact records and attachments, your business decides the purpose. Yona processes it on your behalf, only to run the service.',
                ],
                'note' => 'If you are a customer of a business that uses Yona, contact that business first. We help them answer your request.',
            ],
            'collected' => [
                'heading' => '2. What Yona stores',
                'points' => [
                    'account' => 'Accounts and members: name, email, avatar, language, password (stored only as a hash that cannot be reversed), and the two-factor secret if you turn it on (stored encrypted).',
                    'sessions' => 'Sign-in sessions: the IP address and browser of each session, so you can review and sign out sessions remotely from your Profile.',
                    'conversations' => 'Conversations: the content of messages in both directions, attachments such as images, videos, voice notes and documents, plus private notes, labels and assignees.',
                    'contacts' => 'Contact records: name, phone number, email, avatar, custom attributes and notes entered by your team or sent in by a channel.',
                    'widget' => 'Visitors using the website chat: browser type and language, and the page they were on when the chat started.',
                    'channels' => 'Channel connection details: the personal Zalo sign-in session (see section 5), the mailbox password of an email channel, the Google tokens of a Gmail inbox (see section 6) and access tokens of other channels. Email passwords and access tokens are stored encrypted, except the API keys of WhatsApp and SMS channels, which are not encrypted yet.',
                    'public' => 'Yona\'s public pages: the name, phone number and note you send on the Book a demo page, and messages you send through the chat on yona.vn.',
                ],
            ],
            'purposes' => [
                'heading' => '3. What Yona uses data for',
                'points' => [
                    'messaging' => 'Receiving and sending messages on the channels you connect, and showing the inbox and customer records to your team.',
                    'security' => 'Signing in and keeping accounts safe.',
                    'email' => 'Sending system email: sign-up confirmation, password reset and the notifications you turned on.',
                    'support' => 'Helping you when you ask, and fixing problems.',
                    'demo' => 'Calling you back when you book a demo.',
                    'analytics' => 'Counting page views in aggregate with Plausible, an analytics tool that uses no cookies.',
                ],
            ],
            'access' => [
                'heading' => '4. Who can see the data',
                'points' => [
                    'members' => 'Members of your account, according to their role and the inboxes they are assigned to.',
                    'isolation' => 'Each business\'s data is kept apart by account. Members of one account cannot see another account\'s data.',
                    'yona' => 'The Yona operations team: it has system administrator rights and can sign in as a user to help or fix a problem. It then sees exactly what that user sees.',
                    'files' => 'Attachments open through links that contain a random string, without signing in. Anyone holding a link can open the file, so do not share file links outside your team.',
                ],
            ],
            'zalo_session' => [
                'heading' => '5. The personal Zalo sign-in session',
                'points' => [
                    'stored' => 'When you scan the QR code, Yona stores the Zalo session (its cookies) as a file on the server to keep the connection alive. Whoever holds this file can use that Zalo account.',
                    'protection' => 'Only Yona\'s Zalo service process can read the file (mode 0600 inside a 0700 directory). The file is not yet encrypted on disk.',
                    'removal' => 'When you disconnect Zalo in the inbox settings, the session file is deleted.',
                    'transport' => 'Zalo messages travel through the unofficial open source library zca-js to Zalo\'s servers.',
                ],
            ],
            'google_data' => [
                'heading' => '6. Data from your Google account (Gmail)',
                'body' => [
                    'intro' => 'When you choose Sign in with Google to connect a Gmail or Google Workspace mailbox, Yona asks for access to Gmail (scope https://mail.google.com/) and the email address of that account. This section explains what Yona does with Google data.',
                ],
                'points' => [
                    'accessed' => 'Data Yona accesses: the messages in your inbox (sender, recipients, subject, body, attachments) and the email address of the Google account you connect. Yona reads mail over Gmail IMAP and sends mail over Gmail SMTP with the access token Google issues.',
                    'use' => 'Sole purpose: bringing your customers\' emails into your team\'s shared inbox on Yona, and sending the replies or new emails your team writes from your own address. Yona does not delete or move messages in Gmail; when Yona downloads a message, Gmail marks it as read.',
                    'notifications' => 'To show new mail almost instantly, Yona subscribes to Gmail "new mail" notifications through Google Cloud Pub/Sub. A notification only carries the email address and a sequence number, never message content.',
                    'storage' => 'Google access and refresh tokens are stored encrypted. Synced messages are stored on Yona\'s servers like every other conversation (section 2).',
                    'sharing' => 'Yona does not sell Gmail data, does not use it for advertising and does not transfer it to third parties, except when you turn on a tool that receives conversation data yourself (webhooks, agent bots, integrations in section 7), when needed to run a feature you use, or when the law requires it.',
                    'ai' => 'Yona does not use Gmail data to train or improve generalized artificial intelligence or machine learning models.',
                    'people' => 'The Yona operations team does not read your Gmail messages, except when you ask for help with a specific issue, when needed to investigate security incidents or abuse, or when the law requires it.',
                    'disconnect' => 'Disconnecting: deleting the Gmail inbox in Inbox settings makes Yona delete the tokens, stop Gmail notifications and delete that inbox\'s conversations. Attachments of those conversations are not removed automatically yet; contact us as described in the Contact section to have them deleted. You can also revoke Yona\'s access at any time at https://myaccount.google.com/permissions.',
                    'limited_use' => 'Yona\'s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy (https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.',
                ],
            ],
            'third_parties' => [
                'heading' => '7. Third parties that take part',
                'points' => [
                    'zalo' => 'Zalo: receives and sends messages for the personal Zalo channel.',
                    'other_channels' => 'Other messaging platforms you connect, such as Telegram, LINE, WhatsApp or an SMS provider: receive and send messages for that channel.',
                    'cloudflare' => 'Cloudflare: all traffic to yona.vn passes through Cloudflare\'s network. Cloudflare servers may be located outside Vietnam.',
                    'mail' => 'An email delivery provider: carries system email to your mailbox.',
                    'your_mailbox' => 'Your own mail server: when you connect an email channel, Yona reads and sends mail over IMAP/SMTP with the account you provide.',
                    'google' => 'Google: a Gmail inbox connected with Sign in with Google is read and sent through Gmail servers, and new-mail notifications go through Google Cloud Pub/Sub (see section 6).',
                    'plausible' => 'Plausible: counts page views, without cookies.',
                    'push' => 'Your browser\'s push service: only if you turn on push notifications, the notification content passes through the push service of the browser you use.',
                    'your_tools' => 'Tools you connect yourself: webhooks, agent bots and the integrations you enable receive conversation data exactly as you configure them. You are responsible for those destinations.',
                ],
            ],
            'retention' => [
                'heading' => '8. Keeping and deleting data',
                'points' => [
                    'kept' => 'Messages, contact records and files are kept until you delete them or ask for your account to be deleted. Yona does not yet delete conversations automatically after a set period.',
                    'notifications' => 'In-app notifications older than one month are cleaned up automatically.',
                    'self_service' => 'You can delete contacts, messages and inboxes yourself inside the app.',
                    'account' => 'There is no self-service account deletion yet. Message us as described under Contact, and the operations team will delete the account and its data from the system administration page.',
                ],
            ],
            'security' => [
                'heading' => '9. Security',
                'points' => [
                    'https' => 'Connections to Yona use HTTPS.',
                    'passwords' => 'Passwords are stored as hashes. You can turn on two-factor authentication.',
                    'secrets' => 'Email mailbox passwords, Google tokens and channel access tokens are stored encrypted, except the API keys of WhatsApp and SMS channels (not encrypted yet).',
                    'zalo' => 'The Zalo session is stored as an unencrypted file, protected only by read permissions (see section 5).',
                    'incident' => 'No system is perfectly secure. If we find an incident that exposes data, we tell the administrators of the affected accounts.',
                ],
            ],
            'rights' => [
                'heading' => '10. Your rights',
                'body' => [
                    'intro' => 'Under Vietnamese law on personal data protection, you have the right to:',
                ],
                'points' => [
                    'know' => 'know what data is processed and why, which is what this page is for;',
                    'access' => 'view and correct your own details in your Profile;',
                    'portability' => 'take your data out: export the contact list to CSV inside the app, and request anything else through Contact;',
                    'delete' => 'ask for data to be deleted, or for processing to be restricted or stopped;',
                    'withdraw' => 'withdraw consent by stopping use and asking for your account to be deleted;',
                    'complain' => 'complain to us or to the competent state authority.',
                ],
                'note' => 'We answer through the same channel you used to reach us.',
            ],
            'cookies' => [
                'heading' => '11. Cookies',
                'points' => [
                    'session' => 'Session and request-forgery protection cookies: required to sign in.',
                    'locale' => 'Language cookie: remembers the language you chose.',
                    'widget' => 'The chat on yona.vn keeps a conversation token in your browser, so you see earlier messages when you come back.',
                    'no_ads' => 'Yona uses no advertising or tracking cookies.',
                ],
            ],
            'changes' => [
                'heading' => '12. Changes to this policy',
                'body' => [
                    'how' => 'When this policy changes, we update the date at the top of this page. Changes that affect your rights are announced in advance to account administrators.',
                ],
            ],
            'contact' => [
                'heading' => '13. Contact',
                'body' => [
                    'how' => 'Message us through the chat in the bottom corner of any yona.vn page, or leave your phone number on the Book a demo page. Both go straight into the Yona team\'s inbox.',
                ],
            ],
        ],
    ],
];
