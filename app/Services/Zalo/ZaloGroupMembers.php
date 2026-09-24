<?php

namespace App\Services\Zalo;

use App\Models\Channel\Zalo;
use App\Models\Conversation;
use App\Services\Channels\ChannelGroupMembers;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Danh bạ nhóm Zalo qua bridge (`GET /ui/group-members`). Chỉ cache kết quả thành
 * công: bridge lỗi thì lần mở sau hỏi lại, không giữ một danh sách rỗng suốt
 * mười phút.
 */
class ZaloGroupMembers implements ChannelGroupMembers
{
    private const CACHE_SECONDS = 600;

    public function __construct(private readonly ZaloBridgeClient $bridge) {}

    public function isGroup(Conversation $conversation): bool
    {
        $channel = $conversation->inbox?->channel;

        return $channel instanceof Zalo && $channel->isGroupThread($conversation);
    }

    public function members(Conversation $conversation): array
    {
        $channel = $conversation->inbox?->channel;
        $groupId = $channel instanceof Zalo ? $channel->threadIdOf($conversation) : null;

        if (! $channel instanceof Zalo || blank($groupId)) {
            return [];
        }

        $cacheKey = "zalo:group-members:{$channel->connectionId()}:{$groupId}";
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        $members = $this->fetch($channel, (string) $groupId);

        if ($members === null) {
            return [];
        }

        Cache::put($cacheKey, $members, self::CACHE_SECONDS);

        return $members;
    }

    /** @return list<array{external_id: string, name: string, avatar: string|null}>|null */
    private function fetch(Zalo $channel, string $groupId): ?array
    {
        $response = $this->bridge->groupMembers($channel, $groupId);
        $body = $response?->json();

        if ($response === null || ! $response->successful() || ! is_array($body) || ($body['ok'] ?? false) !== true) {
            Log::warning('zalo.group_members.unavailable', [
                'connection_id' => $channel->connectionId(),
                'status' => $response?->status(),
                'message' => is_array($body) ? ($body['message'] ?? null) : null,
            ]);

            return null;
        }

        $members = [];

        foreach (is_array($body['members'] ?? null) ? $body['members'] : [] as $member) {
            $externalId = is_array($member) && is_scalar($member['id'] ?? null) ? trim((string) $member['id']) : '';
            $name = is_array($member) && is_string($member['name'] ?? null) ? trim($member['name']) : '';

            if ($externalId === '' || $name === '' || $externalId === (string) $channel->zalo_uid) {
                continue;
            }

            $members[] = [
                'external_id' => $externalId,
                'name' => $name,
                'avatar' => is_string($member['avatar'] ?? null) && $member['avatar'] !== '' ? $member['avatar'] : null,
            ];
        }

        return $members;
    }
}
