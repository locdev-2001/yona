<?php

namespace App\Services\Integrations\Slack;

use App\Models\Integrations\Hook;

// Port từ refs/chatwoot/lib/integrations/slack/channel_builder.rb — liệt kê kênh
// Slack bot có thể thấy (public + private) và gán một kênh làm reference_id
// của hook, tự "join" nếu kênh là public.
class ChannelBuilder
{
    public function __construct(private readonly Hook $hook) {}

    /** @return list<array<string, mixed>> */
    public function fetchChannels(): array
    {
        return $this->channels();
    }

    public function update(?string $referenceId): ?Hook
    {
        $channel = $this->findChannel($referenceId);

        if ($channel === null) {
            return null;
        }

        if (($channel['is_private'] ?? false) === false) {
            $this->slackClient()->conversationsJoin($channel['id']);
        }

        $this->hook->update([
            'reference_id' => $channel['id'],
            'settings' => ['channel_name' => $channel['name']],
            'status' => Hook::STATUS_ENABLED,
        ]);

        return $this->hook;
    }

    private function slackClient(): SlackClient
    {
        return new SlackClient($this->hook->access_token);
    }

    /** @return list<array<string, mixed>> */
    private function channels(): array
    {
        // Tách riêng cuộc gọi private/public: Slack áp rate limit khác nhau
        // cho request trộn cả hai loại — chia ra tránh bị giới hạn tần suất.
        return [
            ...$this->fetchChannelsByType('private_channel'),
            ...$this->fetchChannelsByType('public_channel'),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function fetchChannelsByType(string $channelType, int $limit = 1000): array
    {
        $channelList = [];
        $cursor = null;

        do {
            $response = $this->slackClient()->conversationsList(array_filter([
                'types' => $channelType,
                'exclude_archived' => 'true',
                'limit' => $limit,
                'cursor' => $cursor,
            ], fn (mixed $value) => $value !== null));

            $channelList = [...$channelList, ...($response['channels'] ?? [])];
            $cursor = $response['response_metadata']['next_cursor'] ?? null;
        } while (filled($cursor));

        return $channelList;
    }

    private function findChannel(?string $referenceId): ?array
    {
        if ($referenceId === null) {
            return null;
        }

        foreach ($this->channels() as $channel) {
            if (($channel['id'] ?? null) === $referenceId) {
                return $channel;
            }
        }

        return null;
    }
}
