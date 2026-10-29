<?php

namespace App\Services\MessengerPersonal;

use App\Models\Channel\MessengerPersonal;
use App\Models\Conversation;
use App\Services\Channels\ChannelGroupMembers;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Danh bạ nhóm Messenger qua sidecar (`GET /chats/members`). Chỉ cache kết quả thành
 * công: sidecar lỗi thì lần mở sau hỏi lại, không giữ một danh sách rỗng.
 */
class GroupMembers implements ChannelGroupMembers
{
    private const CACHE_SECONDS = 300;

    public function __construct(private readonly BridgeClient $bridge) {}

    public function isGroup(Conversation $conversation): bool
    {
        return MessengerChat::ofConversation($conversation)?->isGroup() === true;
    }

    public function members(Conversation $conversation): array
    {
        $channel = $conversation->inbox?->channel;
        $chat = MessengerChat::ofConversation($conversation);

        if (! $channel instanceof MessengerPersonal || $chat === null || ! $chat->isGroup()) {
            return [];
        }

        $cacheKey = "messenger-personal:group-members:{$channel->connectionId()}:{$chat->id}";
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        $members = $this->fetch($channel, $chat);

        if ($members === null) {
            return [];
        }

        Cache::put($cacheKey, $members, self::CACHE_SECONDS);

        return $members;
    }

    /** @return list<array{external_id: string, name: string, avatar: string|null}>|null */
    private function fetch(MessengerPersonal $channel, MessengerChat $chat): ?array
    {
        $response = $this->bridge->chatMembers($channel, $chat);
        $body = $response?->json();

        if ($response === null || ! $response->successful() || ! is_array($body) || ($body['ok'] ?? false) !== true) {
            Log::warning('messenger_personal.group_members.unavailable', [
                'connection_id' => $channel->connectionId(),
                'status' => $response?->status(),
                'code' => is_array($body) ? ($body['code'] ?? null) : null,
            ]);

            return null;
        }

        $members = [];

        foreach (is_array($body['members'] ?? null) ? $body['members'] : [] as $member) {
            $externalId = is_array($member) && is_scalar($member['id'] ?? null) ? trim((string) $member['id']) : '';
            $name = is_array($member) && is_string($member['name'] ?? null) ? trim($member['name']) : '';

            if ($externalId === '' || $name === '' || $externalId === (string) $channel->facebook_user_id) {
                continue;
            }

            $members[] = [
                'external_id' => $externalId,
                'name' => $name,
                'avatar' => is_string($member['avatar_url'] ?? null) && $member['avatar_url'] !== '' ? $member['avatar_url'] : null,
            ];
        }

        return $members;
    }
}
