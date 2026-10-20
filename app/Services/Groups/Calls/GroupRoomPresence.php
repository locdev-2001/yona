<?php

namespace App\Services\Groups\Calls;

use App\Jobs\Calls\BroadcastGroupVoiceRoomJob;
use App\Models\Call;
use App\Services\Calls\Kinds\CallPresenceObserver;

// Người vào/ra phòng nhóm hay bật/tắt chia sẻ màn hình: đẩy lại chỉ báo phòng tới thành viên,
// gom theo nhịp để phòng đông không bắn một lượt cho từng sự kiện.
final class GroupRoomPresence implements CallPresenceObserver
{
    public function presenceChanged(Call $call): void
    {
        BroadcastGroupVoiceRoomJob::dispatch($call->yona_group_id)->delay(now()->addSeconds(BroadcastGroupVoiceRoomJob::BATCH_SECONDS));
    }
}
