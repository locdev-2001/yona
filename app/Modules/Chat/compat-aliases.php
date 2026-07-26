<?php

use App\Http\Controllers\Chat\ConversationAssignController;
use App\Http\Controllers\Chat\ConversationAttachmentController;
use App\Http\Controllers\Chat\ConversationLeadController;
use App\Http\Controllers\Chat\ConversationPanelController;
use App\Http\Controllers\Chat\ConversationPhoneController;
use App\Http\Controllers\Chat\ConversationStreamController;
use App\Http\Controllers\Chat\InboxController;
use App\Http\Controllers\Chat\InboxSettingController;
use App\Http\Controllers\Chat\MessageInteractionController;
use App\Http\Controllers\Chat\QuickReplyController;
use App\Http\Controllers\Chat\ZaloPersonal\ZaloConnectionController;
use App\Http\Controllers\Chat\ZaloPersonal\ZaloPersonalWebhookController;
use App\Modules\Chat\Adapter\ZaloPersonal\Delivery\ZaloInteractionService;
use App\Modules\Chat\Adapter\ZaloPersonal\Delivery\ZaloSendService;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\RateCapException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\SendOutsideWindowException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloCircuitOpenException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloNotConnectedException;
use App\Modules\Chat\Adapter\ZaloPersonal\Exception\ZaloSplitBrainException;
use App\Modules\Chat\Adapter\ZaloPersonal\Health\ZaloHealthMonitor;
use App\Modules\Chat\Adapter\ZaloPersonal\Intake\ZaloBackfillService;
use App\Modules\Chat\Adapter\ZaloPersonal\Intake\ZaloStateEventParser;
use App\Modules\Chat\Adapter\ZaloPersonal\Policy\SendRateLimiter;
use App\Modules\Chat\Adapter\ZaloPersonal\PromoteAccountBinder;
use App\Modules\Chat\Adapter\ZaloPersonal\ZaloChannelDriver;
use App\Modules\Chat\Adapter\ZaloPersonal\ZaloPersonalServiceProvider;
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
use App\Modules\Chat\Store\DedupConversation;
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

    // Cụm 4 — Adapter/ZaloPersonal/ + gộp hội thoại trùng về Store/
    'App\Modules\Integration\Chat\ZaloPersonal\Exceptions\RateCapException' => RateCapException::class,
    'App\Modules\Integration\Chat\ZaloPersonal\Exceptions\SendOutsideWindowException' => SendOutsideWindowException::class,
    'App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloCircuitOpenException' => ZaloCircuitOpenException::class,
    'App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloNotConnectedException' => ZaloNotConnectedException::class,
    'App\Modules\Integration\Chat\ZaloPersonal\Exceptions\ZaloSplitBrainException' => ZaloSplitBrainException::class,
    'App\Modules\Integration\Chat\ZaloPersonal\SendRateLimiter' => SendRateLimiter::class,
    'App\Modules\Integration\Chat\ZaloPersonal\ZaloChannelDriver' => ZaloChannelDriver::class,
    'App\Modules\Integration\Chat\ZaloPersonal\ZaloHealthMonitor' => ZaloHealthMonitor::class,
    'App\Modules\Integration\Chat\ZaloPersonal\ZaloInteractionService' => ZaloInteractionService::class,
    'App\Modules\Integration\Chat\ZaloPersonal\ZaloPersonalServiceProvider' => ZaloPersonalServiceProvider::class,
    'App\Modules\Integration\Chat\ZaloPersonal\ZaloSendService' => ZaloSendService::class,
    'App\Modules\Integration\Chat\ZaloPersonal\ZaloStateEventParser' => ZaloStateEventParser::class,
    'App\Services\Rekey\DuplicateConversationMerger' => DedupConversation::class,
    'App\Services\Zalo\PromoteAccountBinder' => PromoteAccountBinder::class,
    'App\Services\ZaloBackfillService' => ZaloBackfillService::class,

    // Cụm 5 — Controllers/Chat/
    'App\Http\Controllers\Inbox\ConversationAssignController' => ConversationAssignController::class,
    'App\Http\Controllers\Inbox\ConversationAttachmentController' => ConversationAttachmentController::class,
    'App\Http\Controllers\Inbox\ConversationLeadController' => ConversationLeadController::class,
    'App\Http\Controllers\Inbox\ConversationPanelController' => ConversationPanelController::class,
    'App\Http\Controllers\Inbox\ConversationPhoneController' => ConversationPhoneController::class,
    'App\Http\Controllers\Inbox\ConversationStreamController' => ConversationStreamController::class,
    'App\Http\Controllers\Inbox\InboxController' => InboxController::class,
    'App\Http\Controllers\Inbox\InboxSettingController' => InboxSettingController::class,
    'App\Http\Controllers\Inbox\MessageInteractionController' => MessageInteractionController::class,
    'App\Http\Controllers\Inbox\QuickReplyController' => QuickReplyController::class,
    'App\Http\Controllers\Integration\ZaloConnectionController' => ZaloConnectionController::class,
    'App\Http\Controllers\Integration\ZaloPersonalWebhookController' => ZaloPersonalWebhookController::class,
];
