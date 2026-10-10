<?php

namespace App\Channels;

/**
 * Kênh kiểm địa chỉ nó tự suy ra (AddressesContacts) có gửi tới được không trước khi lõi
 * mở hội thoại trên địa chỉ đó. Lõi chỉ gọi qua contract này, lý do từ chối do kênh viết.
 */
interface ChecksContactAddress
{
    /** @throws UndeliverableContactAddress */
    public function assertDeliverable(string $sourceId): void;
}
