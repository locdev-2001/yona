<?php

namespace App\Services\Integrations\Slack;

use App\Models\Conversation;
use App\Models\Integrations\Hook;

// Port từ refs/chatwoot/lib/integrations/slack/slack_link_unfurl_service.rb — khi
// một agent dán link hội thoại Chatwoot vào Slack, trả preview card qua chat.unfurl.
class SlackLinkUnfurlService
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly array $params,
        private readonly Hook $integrationHook,
    ) {}

    /** @return list<array<string, mixed>> Danh sách link đã xét (không lọc) — giống Enumerable#each của Ruby. */
    public function perform(): array
    {
        $eventLinks = data_get($this->params, 'event.links');

        if ($eventLinks === null) {
            return [];
        }

        foreach ($eventLinks as $linkInfo) {
            $url = $linkInfo['url'] ?? null;

            if ($url !== null && $this->validAccount($url)) {
                $this->unfurlLink($url);
            }
        }

        return $eventLinks;
    }

    private function unfurlLink(string $url): void
    {
        $conversation = $this->conversationFromUrl($url);

        if ($conversation === null) {
            return;
        }

        $this->sendUnfurls($url, $conversation);
    }

    /** @return array{user_name: string, email: string, phone_number: string, company_name: string} */
    private function contactAttributes(Conversation $conversation): array
    {
        $contact = $conversation->contact;

        return [
            'user_name' => filled($contact?->name) ? $contact->name : '---',
            'email' => filled($contact?->email) ? $contact->email : '---',
            'phone_number' => filled($contact?->phone_number) ? $contact->phone_number : '---',
            'company_name' => filled(data_get($contact?->additional_attributes, 'company_name'))
                ? data_get($contact->additional_attributes, 'company_name')
                : '---',
        ];
    }

    private function sendUnfurls(string $url, Conversation $conversation): void
    {
        $userInfo = $this->contactAttributes($conversation);
        $unfurls = (new LinkUnfurlFormatter($url, $userInfo, $conversation->inbox->name, $conversation->inbox->inboxType()))->perform();

        $unfurlParams = [
            'unfurl_id' => data_get($this->params, 'event.unfurl_id'),
            'source' => data_get($this->params, 'event.source'),
            'unfurls' => json_encode($unfurls),
        ];

        (new SendOnSlackService(null, $this->integrationHook))->linkUnfurl($unfurlParams);
    }

    private function conversationFromUrl(string $url): ?Conversation
    {
        $conversationId = $this->extractConversationId($url);

        return $conversationId === null ? null : Conversation::query()
            ->where('display_id', $conversationId)
            ->where('account_id', $this->integrationHook->account_id)
            ->first();
    }

    private function validAccount(string $url): bool
    {
        return $this->extractAccountId($url) === (string) $this->integrationHook->account_id;
    }

    private function extractAccountId(string $url): ?string
    {
        return preg_match('#/accounts/(\d+)#', $url, $matches) ? $matches[1] : null;
    }

    private function extractConversationId(string $url): ?string
    {
        return preg_match('#/conversations/(\d+)#', $url, $matches) ? $matches[1] : null;
    }
}
