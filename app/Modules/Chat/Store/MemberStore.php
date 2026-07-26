<?php

namespace App\Modules\Chat\Store;

use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Modules\Identity\Contracts\IdentityResolver;
use App\Modules\Identity\Data\ObservedIdentity;

/**
 * Ghi "ai đang ở trong luồng này".
 *
 * Ghi cho CẢ 1-1 lẫn nhóm (1-1 đúng một hàng) để câu hỏi "người này ở đâu" chỉ
 * có một đường trả lời. Trước đây thông tin này nằm trong một cột jsonb, và câu
 * hỏi đó không trả lời được nếu không quét cả bảng.
 */
class MemberStore
{
    public function __construct(private readonly IdentityResolver $identities) {}

    /**
     * Ghi nhận một người vừa xuất hiện trong luồng.
     *
     * @param  string  $channel  kênh của luồng — để biết người này đang dùng kênh nào
     */
    public function remember(
        Conversation $conversation,
        string $senderUid,
        string $channel,
        ?string $displayName = null,
        ?string $avatarUrl = null,
    ): ConversationMember {
        $resolved = $this->identities->observe(new ObservedIdentity(
            workspaceId: $conversation->workspace_id,
            key: $channel.'_uid',
            value: $senderUid,
            source: $channel,
            channelAccountId: $conversation->channel_account_id,
            displayName: $displayName,
            avatarUrl: $avatarUrl,
            channels: [$channel],
        ));

        /** @var ConversationMember $member */
        $member = ConversationMember::query()->firstOrNew([
            'conversation_id' => $conversation->id,
            'sender_uid' => $senderUid,
        ]);

        $member->fill([
            'workspace_id' => $conversation->workspace_id,
            'channel_account_id' => $conversation->channel_account_id,
            'identity_id' => $resolved->identityId,
            'profile_id' => $resolved->profileId,
            'last_seen_at' => now(),
        ]);

        $member->first_seen_at ??= now();
        $member->save();

        return $member;
    }
}
