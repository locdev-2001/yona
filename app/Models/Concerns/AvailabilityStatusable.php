<?php

namespace App\Models\Concerns;

// Port từ refs/chatwoot/app/models/concerns/availability_statusable.rb.
// Trạng thái hiển thị KHÔNG phải cột `availability`: khi auto_offline bật
// (mặc định), trạng thái đi theo presence realtime, không có presence = offline.
trait AvailabilityStatusable
{
    public function availabilityStatus(): string
    {
        // OnlineStatusTracker (Redis) vào cùng realtime ở B4 — tới đó
        // onlinePresence() đọc presence thật thay cho false cứng.
        if (! $this->auto_offline) {
            return $this->availabilityName();
        }

        return $this->onlinePresence() ? $this->availabilityName() : 'offline';
    }

    protected function onlinePresence(): bool
    {
        return false;
    }
}
