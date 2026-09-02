<?php

namespace App\Models\Concerns;

use App\Support\OnlineStatusTracker;

// Port từ refs/chatwoot/app/models/concerns/availability_statusable.rb (nhánh User;
// Contact có availabilityStatus riêng). Trạng thái hiển thị KHÔNG phải cột
// `availability`: khi auto_offline bật (mặc định), trạng thái đi theo presence
// realtime, không có presence = offline.
trait AvailabilityStatusable
{
    public function availabilityStatus(): string
    {
        if (! $this->auto_offline) {
            return $this->availabilityName();
        }

        if (! $this->onlinePresence()) {
            return 'offline';
        }

        // Cột availability là dự phòng khi Redis chưa có status.
        return OnlineStatusTracker::getStatus($this->account_id, $this->user_id) ?? $this->availabilityName();
    }

    public function onlinePresence(): bool
    {
        return OnlineStatusTracker::getPresence($this->account_id, 'User', $this->user_id);
    }
}
