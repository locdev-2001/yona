<?php

namespace App\Channels;

/**
 * Kênh tự khai năng lực của mình — nguồn khai báo DUY NHẤT
 * (docs/channel-capabilities.md §1.2). Lõi hỏi qua `Inbox::supports()`.
 *
 * Luật: chỉ khai năng lực đã chạy thật và có contract test chứng minh. Khai mà
 * không làm được = UI hiện nút chết; làm được mà không khai = tính năng bị ẩn.
 */
interface DeclaresCapabilities
{
    public function capabilities(): CapabilitySet;
}
