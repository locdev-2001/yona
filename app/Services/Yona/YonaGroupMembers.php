<?php

namespace App\Services\Yona;

use App\Models\Channel\Yona;
use App\Models\Conversation;
use App\Models\YonaGroup;
use App\Models\YonaGroupMember;
use App\Services\Channels\ChannelGroupMembers;

// Danh bạ nhóm Yona đọc thẳng từ DB: dòng của thành viên hoặc hội thoại gốc của nhóm.
class YonaGroupMembers implements ChannelGroupMembers
{
    public function isGroup(Conversation $conversation): bool
    {
        return $this->groupOf($conversation) !== null;
    }

    public function members(Conversation $conversation): array
    {
        return $this->groupOf($conversation)?->activeMembers()->with('user')->get()
            ->map(fn (YonaGroupMember $member) => [
                'external_id' => Yona::contactSourceIdFor($member->user_id),
                'name' => $member->user->availableName(),
                'avatar' => $member->user->avatarUrl() ?: null,
            ])
            ->values()
            ->all() ?? [];
    }

    private function groupOf(Conversation $conversation): ?YonaGroup
    {
        return YonaGroup::query()
            ->where('conversation_id', $conversation->thread_conversation_id ?? $conversation->id)
            ->first();
    }
}
