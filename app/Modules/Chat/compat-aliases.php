<?php

use App\Modules\Chat\Broadcast\BroadcastService;
use App\Modules\Chat\Delivery\DeliveryPipeline;
use App\Modules\Chat\Delivery\OutboundMessage;
use App\Modules\Chat\Delivery\SeenSyncService;
use App\Modules\Chat\Intake\DuplicateResolver;
use App\Modules\Chat\Intake\IntakeService;
use App\Modules\Chat\Port\AbstractChannelDriver;
use App\Modules\Chat\Port\ChannelCapabilities;
use App\Modules\Chat\Port\ChannelDriver;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Chat\Port\Exception\UnsupportedCapabilityException;
use App\Modules\Chat\Status\MessageStatusService;
use App\Modules\Chat\Store\GapMarkerService;
use App\Modules\Chat\Store\PhoneEnrichmentService;
use App\Modules\Chat\Store\SystemLineService;
use App\Modules\Chat\Timeline\MessageItemSerializer;
use App\Modules\Chat\Timeline\TimelineCursor;

/*
 * Bí danh tương thích ngược: FQCN CŨ => FQCN MỚI.
 *
 * Chỉ phục vụ dữ liệu đã nằm ngoài tầm với của một lần sửa code:
 *   - job đã serialize trong bảng `jobs` (queue connection = database) — payload
 *     giữ nguyên tên class lúc đẩy vào hàng đợi, worker chạy sau khi đã đổi tên
 *     sẽ unserialize ra một class không còn tồn tại;
 *   - FQCN lưu dưới dạng chuỗi trong DB.
 *
 * KHÔNG dùng để né việc sửa `use` trong code: mọi tham chiếu trong repo phải trỏ
 * thẳng tên mới. Bảng này chết ở P5 — trước khi xóa phải kiểm `jobs` = 0 và
 * không có `failed_jobs` mới trong 24h.
 *
 * @return array<class-string, class-string>
 */

return [
    // Cụm 1 — Port/
    'App\Modules\Integration\ChannelManager' => ChannelRegistry::class,
    'App\Modules\Integration\Contracts\ChannelCapabilities' => ChannelCapabilities::class,
    'App\Modules\Integration\Contracts\ChannelDriver' => ChannelDriver::class,
    'App\Modules\Chat\Exceptions\UnsupportedCapabilityException' => UnsupportedCapabilityException::class,
    'App\Modules\Chat\Support\AbstractChannelDriver' => AbstractChannelDriver::class,

    // Cụm 2 — Intake/ · Store/ · Status/ · Timeline/ · Broadcast/
    'App\Services\InboundMessageService' => IntakeService::class,
    'App\Services\Inbox\MessageItemSerializer' => MessageItemSerializer::class,
    'App\Services\Inbox\MessagePublisher' => BroadcastService::class,
    'App\Services\Inbox\MessageSourceResolver' => DuplicateResolver::class,
    'App\Services\Inbox\MessageStateService' => MessageStatusService::class,
    'App\Services\Inbox\PhoneEnrichmentService' => PhoneEnrichmentService::class,
    'App\Services\Inbox\SessionGapMaterializer' => GapMarkerService::class,
    'App\Services\Inbox\SocialEventMaterializer' => SystemLineService::class,
    'App\Services\Inbox\StreamCursor' => TimelineCursor::class,

    // Cụm 3 — Delivery/
    'App\Modules\Integration\Data\OutboundMessage' => OutboundMessage::class,
    'App\Services\Inbox\OutboundSendPipeline' => DeliveryPipeline::class,
    'App\Services\Inbox\SeenSyncService' => SeenSyncService::class,
];
