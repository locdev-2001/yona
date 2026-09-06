<?php

use App\Models\Contact;
use App\Models\Inbox;
use App\Services\Integrations\Slack\LinkUnfurlFormatter;

// Port từ spec/lib/integrations/slack/link_unfurl_formatter_spec.rb.

it('dựng khối preview + nút mở hội thoại khi có url', function () {
    $contact = Contact::factory()->withEmail()->create();
    $inbox = Inbox::factory()->create();
    $url = 'https://example.com/app/accounts/1/conversations/100';

    $userInfo = [
        'user_name' => $contact->name,
        'email' => $contact->email,
        'phone_number' => '---',
        'company_name' => '---',
    ];

    $result = (new LinkUnfurlFormatter($url, $userInfo, $inbox->name, $inbox->channel_type))->perform();

    expect($result)->toBe([
        $url => [
            'blocks' => [
                [
                    'type' => 'section',
                    'fields' => [
                        ['type' => 'mrkdwn', 'text' => "*Name:*\n{$contact->name}"],
                        ['type' => 'mrkdwn', 'text' => "*Email:*\n{$contact->email}"],
                        ['type' => 'mrkdwn', 'text' => "*Phone:*\n---"],
                        ['type' => 'mrkdwn', 'text' => "*Company:*\n---"],
                        ['type' => 'mrkdwn', 'text' => "*Inbox:*\n{$inbox->name}"],
                        ['type' => 'mrkdwn', 'text' => "*Inbox Type:*\n{$inbox->channel_type}"],
                    ],
                ],
                [
                    'type' => 'actions',
                    'elements' => [
                        [
                            'type' => 'button',
                            'text' => ['type' => 'plain_text', 'text' => 'Open conversation', 'emoji' => true],
                            'url' => $url,
                            'action_id' => 'button-action',
                        ],
                    ],
                ],
            ],
        ],
    ]);
});

it('trả mảng rỗng khi url trống', function () {
    $result = (new LinkUnfurlFormatter(null, [], 'Inbox', 'Channel::Email'))->perform();

    expect($result)->toBe([]);
});
