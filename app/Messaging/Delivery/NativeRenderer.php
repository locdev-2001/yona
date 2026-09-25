<?php

namespace App\Messaging\Delivery;

use App\Channels\Capability;
use App\Messaging\Structured\StructuredType;
use App\Models\Message;

/**
 * Vẽ một loại tin có cấu trúc thành payload gốc của một kênh (chip, nút…).
 * Thêm renderer mới: hiện thực interface này + thêm dòng trong
 * `config/messaging.php['delivery_renderers']`. `DeliveryPlanner` tự chọn
 * renderer đầu tiên vừa được kênh khai năng lực vừa `supports()` loại tin.
 */
interface NativeRenderer
{
    /** Năng lực kênh phải khai để renderer này được chọn. */
    public function capability(): Capability;

    public function supports(StructuredType $type): bool;

    /**
     * @param  array<string, mixed>  $attributes  payload đã chuẩn hoá (`StructuredTypeRegistry::read()`)
     * @return list<array<string, mixed>> các phần cần gửi, theo thứ tự
     */
    public function render(Message $message, array $attributes): array;
}
