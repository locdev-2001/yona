<?php

namespace App\Services\Integrations\Slack;

// Port từ refs/chatwoot/lib/integrations/slack/link_unfurl_formatter.rb — dựng
// khối preview Slack hiện ra khi link hội thoại Chatwoot được dán vào kênh.
// Chuỗi nhãn hardcode ở đây vì lang/en chưa có namespace `slack_unfurl` (nợ,
// xem báo cáo f6-notes-slack.md — porting sang lang/** ngoài phạm vi agent này).
class LinkUnfurlFormatter
{
    /** @param array{user_name: ?string, email: ?string, phone_number: ?string, company_name: ?string} $userInfo */
    public function __construct(
        private readonly ?string $url,
        private readonly array $userInfo,
        private readonly string $inboxName,
        private readonly string $inboxType,
    ) {}

    /** @return array<string, mixed> */
    public function perform(): array
    {
        if (blank($this->url)) {
            return [];
        }

        return [
            $this->url => [
                'blocks' => [...$this->previewBlocks(), ...$this->openConversationButton()],
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    private function previewBlocks(): array
    {
        return [
            [
                'type' => 'section',
                'fields' => [
                    $this->field(__('slack_unfurl.fields.name'), $this->userInfo['user_name'] ?? null),
                    $this->field(__('slack_unfurl.fields.email'), $this->userInfo['email'] ?? null),
                    $this->field(__('slack_unfurl.fields.phone_number'), $this->userInfo['phone_number'] ?? null),
                    $this->field(__('slack_unfurl.fields.company_name'), $this->userInfo['company_name'] ?? null),
                    $this->field(__('slack_unfurl.fields.inbox_name'), $this->inboxName),
                    $this->field(__('slack_unfurl.fields.inbox_type'), $this->inboxType),
                ],
            ],
        ];
    }

    /** @return array<string, string> */
    private function field(string $label, ?string $value): array
    {
        return ['type' => 'mrkdwn', 'text' => "*{$label}:*\n{$value}"];
    }

    /** @return list<array<string, mixed>> */
    private function openConversationButton(): array
    {
        return [
            [
                'type' => 'actions',
                'elements' => [
                    [
                        'type' => 'button',
                        'text' => ['type' => 'plain_text', 'text' => __('slack_unfurl.button'), 'emoji' => true],
                        'url' => $this->url,
                        'action_id' => 'button-action',
                    ],
                ],
            ],
        ];
    }
}
