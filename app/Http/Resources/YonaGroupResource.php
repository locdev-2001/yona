<?php

namespace App\Http\Resources;

use App\Models\CallInvitation;
use App\Models\Conversation;
use App\Models\YonaGroup;
use App\Models\YonaGroupInviteLink;
use App\Models\YonaGroupMember;
use App\Services\Groups\Calls\GroupCallSummaries;
use App\Services\Groups\Calls\GroupRoomSummaries;

// Payload nhóm theo góc nhìn một thành viên: vai trò của họ và dòng hội thoại nhóm trong hộp thư của họ.
final class YonaGroupResource
{
    /**
     * Tóm tắt nhóm gắn vào payload dòng hội thoại nhóm (danh sách, khung chat, panel).
     *
     * @return array<string, mixed>|null
     */
    public static function summaryFor(Conversation $conversation): ?array
    {
        $membership = $conversation->isThreadView() ? $conversation->threadMembership : null;
        $group = $membership?->group;

        if ($group === null) {
            return null;
        }

        $voiceRoom = $membership->isActive() ? app(GroupRoomSummaries::class)->snapshot($group) : null;
        $groupCall = $membership->isActive() ? app(GroupCallSummaries::class)->snapshot($group) : null;
        $myInvitation = $groupCall['group_call'] ?? null
            ? CallInvitation::query()->where('call_id', $groupCall['group_call']['call_id'])->where('user_id', $membership->user_id)->value('status')
            : null;

        return [
            'id' => $group->id,
            'name' => $group->name,
            ...self::avatar($group, $membership->user_id),
            'member_count' => $group->member_count,
            'my_role' => $membership->isActive() ? $membership->role : null,
            'voice_room' => $voiceRoom['voice_room'] ?? null,
            // Mốc đóng trước khi tính `voice_room`: client so với sự kiện voice_room.updated để giữ bản mới hơn.
            'voice_room_as_of' => $voiceRoom['as_of'] ?? now()->getTimestampMs(),
            // Cuộc gọi nhóm có đổ chuông đang diễn ra, kèm lời mời của chính người xem; mốc như voice_room.
            'group_call' => isset($groupCall['group_call']) ? [...$groupCall['group_call'], 'my_invitation' => $myInvitation?->value] : null,
            'group_call_as_of' => $groupCall['as_of'] ?? now()->getTimestampMs(),
        ];
    }

    /**
     * Dữ liệu dựng avatar nhóm (ảnh quản trị tải lên, hình quản trị chọn, hoặc ghép ảnh vài
     * thành viên) — chung cho dòng hội thoại, panel thông tin và trang link mời.
     *
     * @return array{avatar_url: string|null, avatar_seed: string|null, avatar_members: list<array{user_id: int, name: string, avatar_url: string|null}>}
     */
    public static function avatar(YonaGroup $group, ?int $viewerId = null): array
    {
        return [
            'avatar_url' => $group->avatarUrl() ?: null,
            'avatar_seed' => $group->avatar_seed,
            'avatar_traits' => $group->avatar_traits,
            'avatar_members' => self::avatarMembers($group, $viewerId),
        ];
    }

    /**
     * Vài thành viên cho avatar ghép, người khác trước, chính người xem chỉ để lấp chỗ trống.
     *
     * @return list<array{user_id: int, name: string, avatar_url: string|null}>
     */
    private static function avatarMembers(YonaGroup $group, ?int $viewerId): array
    {
        return $group->avatarMembers
            ->sortBy(fn (YonaGroupMember $member) => $member->user_id === $viewerId ? 1 : 0)
            ->take(YonaGroup::AVATAR_MEMBER_COUNT)
            ->map(fn (YonaGroupMember $member) => [
                'user_id' => $member->user_id,
                'name' => $member->user->availableName(),
                'avatar_url' => $member->user->avatarUrl() ?: null,
            ])
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public static function forMember(YonaGroup $group, YonaGroupMember $viewer, bool $withMembers = false): array
    {
        return [
            'id' => $group->id,
            'name' => $group->name,
            'avatar_url' => $group->avatarUrl() ?: null,
            'avatar_seed' => $group->avatar_seed,
            'avatar_traits' => $group->avatar_traits,
            'description' => $group->description,
            'member_count' => $group->member_count,
            'max_members' => YonaGroup::MAX_MEMBERS,
            'my_role' => $viewer->role,
            'conversation_id' => $viewer->conversation->display_id,
            ...($withMembers ? ['members' => self::members($group)] : []),
        ];
    }

    /** @return list<array<string, mixed>> */
    public static function members(YonaGroup $group): array
    {
        return $group->activeMembers()->with('user')->orderBy('created_at')->orderBy('id')->get()
            ->map(fn (YonaGroupMember $member) => [
                'user_id' => $member->user_id,
                'name' => $member->user->availableName(),
                'username' => $member->user->username,
                'avatar_url' => $member->user->avatarUrl() ?: null,
                'role' => $member->role,
                'joined_via' => $member->joined_via,
                'joined_at' => $member->updated_at?->getTimestamp(),
            ])
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public static function inviteLink(YonaGroupInviteLink $link): array
    {
        return [
            'id' => $link->id,
            'status' => $link->status(),
            'expires_at' => $link->expires_at?->getTimestamp(),
            'max_uses' => $link->max_uses,
            'use_count' => $link->use_count,
            'created_at' => $link->created_at?->getTimestamp(),
        ];
    }
}
