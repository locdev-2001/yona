<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\EphemeralStore;

// Dấu "lượt của job này đã bắt đầu", đặt trước mọi việc có hậu quả (gọi mô hình, giữ
// quyền nói, ghi chú). Worker chết rồi job được nhặt lại thì không chạy lượt lần hai;
// job hỏng mà chưa có dấu (chỉ hết hạn chờ khoá hội thoại) thì không phải lượt lỗi.
final class TurnJobMark
{
    private const TTL_SECONDS = 86_400;

    public function __construct(private readonly EphemeralStore $store) {}

    // false khi job đã bắt đầu lượt trước đó.
    public function claim(string $jobKey): bool
    {
        return $this->store->add($this->key($jobKey), 1, self::TTL_SECONDS);
    }

    public function claimed(string $jobKey): bool
    {
        return $this->store->get($this->key($jobKey)) !== null;
    }

    private function key(string $jobKey): string
    {
        return "turn-job:{$jobKey}";
    }
}
