<?php

namespace App\Services\Conversations;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelActionRegistry;
use Collator;

/**
 * Danh sách người agent có thể nhắc tên trong một hội thoại nhóm: người vừa nhắn
 * đứng đầu (đọc tươi từ tin đến), sau đó phần còn lại của danh bạ nhóm theo tên.
 * Danh bạ của kênh hỏng thì vẫn còn "người vừa nhắn" để nhắc.
 */
class GroupMembersService
{
    /** Hình dạng một thành viên — trùng `content_attributes.sender` của tin nhóm. */
    public const MEMBER_KEYS = ['external_id', 'name', 'avatar'];

    private const RECENT_MESSAGES_SCANNED = 300;

    /** @return list<array{external_id: string, name: string, avatar: string|null}> */
    public function forConversation(Conversation $conversation): array
    {
        $driver = ChannelActionRegistry::groupMembersFor($conversation->inbox);

        if ($driver === null || ! $driver->isGroup($conversation)) {
            return [];
        }

        $directory = $this->keyedByExternalId($driver->members($conversation));
        $recent = [];

        foreach ($this->recentSenders($conversation) as $externalId => $sender) {
            $recent[$externalId] = $directory[$externalId] ?? $sender;
            unset($directory[$externalId]);
        }

        return array_values([...$recent, ...$this->sortedByName($directory)]);
    }

    /** @return array<string, array{external_id: string, name: string, avatar: string|null}> */
    private function recentSenders(Conversation $conversation): array
    {
        $messages = $conversation->messages()
            ->where('message_type', Message::TYPE_INCOMING)
            ->orderByDesc('id')
            ->limit(self::RECENT_MESSAGES_SCANNED)
            ->get(['id', 'content_attributes']);

        return $this->keyedByExternalId(
            $messages->map(fn (Message $message) => $message->content_attributes['sender'] ?? null)->all(),
        );
    }

    /**
     * Giữ mục đầu tiên của mỗi `external_id`, bỏ mục thiếu định danh hoặc tên.
     *
     * @param  array<int, mixed>  $members
     * @return array<string, array{external_id: string, name: string, avatar: string|null}>
     */
    private function keyedByExternalId(array $members): array
    {
        $keyed = [];

        foreach ($members as $member) {
            if (! is_array($member)) {
                continue;
            }

            $externalId = is_scalar($member['external_id'] ?? null) ? trim((string) $member['external_id']) : '';
            $name = is_string($member['name'] ?? null) ? trim($member['name']) : '';

            if ($externalId === '' || $name === '' || isset($keyed[$externalId])) {
                continue;
            }

            $avatar = $member['avatar'] ?? null;
            $keyed[$externalId] = [
                'external_id' => $externalId,
                'name' => $name,
                'avatar' => is_string($avatar) && $avatar !== '' ? $avatar : null,
            ];
        }

        return $keyed;
    }

    /**
     * @param  array<string, array{external_id: string, name: string, avatar: string|null}>  $members
     * @return array<string, array{external_id: string, name: string, avatar: string|null}>
     */
    private function sortedByName(array $members): array
    {
        $collator = class_exists(Collator::class) ? new Collator('vi') : null;
        $compare = $collator === null
            ? fn (string $a, string $b) => strcasecmp($a, $b)
            : fn (string $a, string $b) => (int) $collator->compare($a, $b);

        uasort($members, fn (array $a, array $b) => $compare($a['name'], $b['name']));

        return $members;
    }
}
