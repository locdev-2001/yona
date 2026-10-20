<?php

namespace App\Services\Calls\Media;

// Vai đọc webhook của nhà cung cấp. Sự kiện lõi không cần thì trả null.
interface MediaWebhooks
{
    /** @throws InvalidMediaWebhook */
    public function parse(WebhookDelivery $delivery): ?RoomEvent;
}
