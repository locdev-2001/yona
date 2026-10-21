<?php

namespace App\Services\Groups\Calls;

use App\Http\Resources\YonaGroupResource;
use App\Jobs\Calls\BroadcastGroupCallJob;
use App\Models\Call;
use App\Models\YonaGroup;
use App\Models\YonaGroupMember;
use App\Services\Calls\InvitationStatus;
use Illuminate\Contracts\Container\Container;

// Báo cuộc gọi nhóm tới từng thành viên: sự kiện realtime `group_call.updated` vào dòng nhóm trong
// hộp thư của họ, kèm trạng thái lời mời của chính người đó (đang đổ chuông thì máy họ đổ chuông).
final readonly class GroupCallSignals
{
    public const EVENT = 'group_call.updated';

    public function __construct(private Container $container) {}

    public function publish(Call $call): void
    {
        $this->container->make(GroupCallSummaries::class)->forget($call->yona_group_id);
        BroadcastGroupCallJob::dispatch($call->yona_group_id);
    }

    // Cuộc gọi nhóm nhìn từ một thành viên: cùng hình với payload realtime và API.
    /**
     * @param  array{as_of: int, group_call: array<string, mixed>|null}  $snapshot
     * @return array<string, mixed>
     */
    public function viewFor(YonaGroup $group, YonaGroupMember $member, array $snapshot, ?InvitationStatus $invitation): array
    {
        return [
            'account_id' => $member->conversation->account_id,
            'conversation_id' => $member->conversation->display_id,
            'group_id' => $group->id,
            'my_role' => $member->role,
            'group' => ['id' => $group->id, 'name' => $group->name, ...YonaGroupResource::avatar($group, $member->user_id)],
            'group_call' => $snapshot['group_call'] === null ? null : [...$snapshot['group_call'], 'my_invitation' => $invitation?->value],
            'group_call_as_of' => $snapshot['as_of'],
        ];
    }
}
