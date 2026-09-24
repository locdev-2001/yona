<?php

namespace App\Services\Whatsapp\Providers;

use App\Channels\CapabilitySet;
use App\Models\Message;

/**
 * Hợp đồng trung tính giữa kênh WhatsApp và nhà cung cấp. Thêm nhà cung cấp = thêm lớp
 * hiện thực hợp đồng này, không sửa Channel\Whatsapp ngoài một dòng bảng tra.
 */
interface WhatsappProvider
{
    public function sendMessage(string $phoneNumber, Message $message): ?string;

    public function mediaUrl(string $mediaId): string;

    /** @return array<string, string> */
    public function apiHeaders(): array;

    /** Năng lực riêng của nhà cung cấp, cộng thêm vào bộ chung của kênh WhatsApp. */
    public function capabilities(): CapabilitySet;
}
