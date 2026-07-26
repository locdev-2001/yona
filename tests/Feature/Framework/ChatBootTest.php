<?php

use App\Http\Controllers\Chat\WidgetInboundController;
use App\Http\Controllers\Inbox\ConversationAssignController;
use App\Http\Controllers\Inbox\ConversationAttachmentController;
use App\Http\Controllers\Inbox\ConversationLeadController;
use App\Http\Controllers\Inbox\ConversationPanelController;
use App\Http\Controllers\Inbox\ConversationPhoneController;
use App\Http\Controllers\Inbox\ConversationStreamController;
use App\Http\Controllers\Inbox\InboxController;
use App\Http\Controllers\Inbox\InboxSettingController;
use App\Http\Controllers\Inbox\MessageInteractionController;
use App\Http\Controllers\Inbox\QuickReplyController;
use App\Http\Controllers\Integration\IntegrationController;
use App\Http\Controllers\Integration\ZaloConnectionController;
use App\Http\Controllers\Integration\ZaloPersonalWebhookController;
use App\Listeners\LiftPhoneFromBusinessCard;
use App\Models\Conversation;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Automation\Handlers\SendMessageNodeHandler;
use App\Modules\Chat\Adapter\Widget\Intake\WidgetInboundParser;
use App\Modules\Chat\Adapter\Widget\WidgetChannelDriver;
use App\Modules\Chat\Broadcast\BroadcastService;
use App\Modules\Chat\Delivery\InteractionPipeline;
use App\Modules\Chat\Intake\DuplicateResolver;
use App\Modules\Chat\Intake\IntakeService;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Chat\Status\MessageStatusService;
use App\Modules\Chat\Store\GapMarkerService;
use App\Modules\Chat\Store\PhoneEnrichmentService;
use App\Modules\Chat\Store\SystemLineService;
use App\Modules\Chat\Timeline\MessageItemSerializer;
use App\Modules\Chat\Timeline\TimelineCursor;
use App\Modules\Integration\Chat\ZaloPersonal\SendRateLimiter;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloChannelDriver;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloHealthMonitor;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloInteractionService;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloSendService;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloStateEventParser;
use App\Modules\Integration\IntegrationCatalog;
use App\Modules\Integration\PaymentManager;
use App\Services\Inbox\OutboundSendPipeline;
use App\Services\Inbox\SeenSyncService;
use App\Services\NoteService;
use App\Services\Rekey\DuplicateConversationMerger;
use App\Services\TagService;
use App\Services\Zalo\PromoteAccountBinder;
use App\Services\ZaloBackfillService;
use Illuminate\Support\Facades\Route;

/**
 * Lưới an toàn cho đợt di dời P3.
 *
 * Cả ba test phải XANH NGAY từ trước khi đụng file nào — chúng khóa hành vi đang
 * chạy, không mô tả hành vi mới. Sau mỗi cụm `git mv` chúng phải vẫn xanh; đỏ ở
 * đây nghĩa là đợt di dời làm mất một mối nối mà `use`-statement không lộ ra:
 * binding container, alias morph, hoặc tên route FE đang gọi.
 *
 * Danh sách trong file này cố tình liệt kê TƯỜNG MINH thay vì quét thư mục —
 * quét thì thư mục đổi chỗ là danh sách tự co lại và test xanh rỗng.
 */

/**
 * Mọi lớp nghiệp vụ chat mà lõi lấy ra từ container.
 *
 * Tên ở đây cập nhật theo từng cụm di dời: cụm nào đổi FQCN thì sửa dòng đó
 * cùng lúc với `git mv`, không để nợ sang cụm sau.
 *
 * @return list<class-string>
 */
function chatBootServices(): array
{
    return [
        // Lõi — tiếp nhận, lưu trữ, đưa đi, trạng thái, dòng hội thoại, phát realtime
        IntakeService::class,
        MessageItemSerializer::class,
        BroadcastService::class,
        DuplicateResolver::class,
        MessageStatusService::class,
        OutboundSendPipeline::class,
        PhoneEnrichmentService::class,
        SeenSyncService::class,
        GapMarkerService::class,
        SystemLineService::class,
        TimelineCursor::class,
        InteractionPipeline::class,

        // Cổng cắm + sổ đăng ký
        ChannelRegistry::class,
        IntegrationCatalog::class,
        PaymentManager::class,

        // Phích cắm kênh nội bộ
        WidgetChannelDriver::class,
        WidgetInboundParser::class,

        // Phích cắm Zalo
        SendRateLimiter::class,
        ZaloChannelDriver::class,
        ZaloHealthMonitor::class,
        ZaloInteractionService::class,
        ZaloSendService::class,
        ZaloStateEventParser::class,
        PromoteAccountBinder::class,
        ZaloBackfillService::class,

        // Mối nối cắt ngang module — không test nào khác canh chúng
        SendMessageNodeHandler::class,
        LiftPhoneFromBusinessCard::class,
        DuplicateConversationMerger::class,
    ];
}

/**
 * Hai sổ đăng ký PHẢI là singleton.
 *
 * Mất chữ `singleton` thì mọi thứ vẫn resolve được, vẫn xanh ở phép thử
 * `toBeInstanceOf` — nhưng mỗi lần `app()` lại dựng một sổ mới, và driver mà
 * provider của phích cắm vừa `extend()` vào biến mất. Hỏng im lặng, chỉ lộ ra
 * lúc gửi tin thật.
 *
 * @return list<class-string>
 */
function chatBootSingletons(): array
{
    return [
        ChannelRegistry::class,
        PaymentManager::class,
    ];
}

/**
 * Controller ở biên vào chat.
 *
 * `app($controller)` chỉ dựng constructor. Bốn chỗ nặng nhất của inbox lại nhận
 * phụ thuộc qua THAM SỐ METHOD (`react`, `stickers`, `resync`, `__invoke`) —
 * chỗ đó router mới resolve, nên phải đọc type-hint từng method mà dựng thử.
 *
 * @return list<class-string>
 */
function chatBootControllers(): array
{
    return [
        ConversationAssignController::class,
        ConversationAttachmentController::class,
        ConversationLeadController::class,
        ConversationPanelController::class,
        ConversationPhoneController::class,
        ConversationStreamController::class,
        InboxController::class,
        InboxSettingController::class,
        IntegrationController::class,
        MessageInteractionController::class,
        QuickReplyController::class,
        WidgetInboundController::class,
        ZaloConnectionController::class,
        ZaloPersonalWebhookController::class,
    ];
}

/**
 * Bề mặt HTTP của chat, chụp TRƯỚC khi tách `web.php` → `web_api.php`.
 *
 * Khóa cả tên LẪN đường dẫn: FE gọi bằng tên nên đổi tên là vỡ FE mà PHP không
 * báo gì; còn đường dẫn thì widget nhúng và bridge gọi thẳng. Tách file route
 * được phép đổi file, không được phép đổi hai thứ này.
 *
 * @return array<string, string>
 */
function chatBootHttpSurface(): array
{
    return [
        'channels.widget.inbound' => 'POST api/channels/widget/inbound',
        'inbox.assign' => 'PATCH inbox/conversations/{conversation}/assign',
        'inbox.attachments.raw' => 'GET|HEAD inbox/attachments/{attachmentKey}/raw',
        'inbox.attachments.show' => 'GET|HEAD inbox/attachments/{attachmentKey}',
        'inbox.attachments.store' => 'POST inbox/conversations/{conversation}/attachments',
        'inbox.index' => 'GET|HEAD inbox',
        'inbox.lead.store' => 'POST inbox/conversations/{conversation}/lead',
        'inbox.messages' => 'GET|HEAD inbox/conversations/{conversation}/messages',
        'inbox.panel' => 'GET|HEAD inbox/conversations/{conversation}/panel',
        'inbox.phone.update' => 'PUT inbox/conversations/{conversation}/phone',
        'inbox.quick-replies.destroy' => 'DELETE inbox/quick-replies/{quickReply}',
        'inbox.quick-replies.index' => 'GET|HEAD inbox/quick-replies',
        'inbox.quick-replies.store' => 'POST inbox/quick-replies',
        'inbox.quick-replies.update' => 'PUT inbox/quick-replies/{quickReply}',
        'inbox.reaction' => 'POST inbox/conversations/{conversation}/messages/{message}/reaction',
        'inbox.read' => 'POST inbox/conversations/{conversation}/read',
        'inbox.resync' => 'POST inbox/resync',
        'inbox.send' => 'POST inbox/conversations/{conversation}/messages',
        'inbox.settings.seen-sync' => 'PUT inbox/settings/seen-sync',
        'inbox.show' => 'GET|HEAD inbox/{conversation}',
        'inbox.stickers' => 'GET|HEAD inbox/conversations/{conversation}/stickers',
        'inbox.stream' => 'GET|HEAD inbox/conversations/{conversation}/stream',
        'integrations.index' => 'GET|HEAD integrations',
        'integrations.zalo.destroy' => 'DELETE integrations/zalo/{zaloConnection}',
        'integrations.zalo.index' => 'GET|HEAD integrations/zalo',
        'integrations.zalo.promote' => 'POST integrations/zalo/promote',
        'integrations.zalo.qr' => 'GET|HEAD integrations/zalo/qr-status',
        'integrations.zalo.store' => 'POST integrations/zalo',
        'zalo.webhook' => 'POST api/integrations/zalo-personal/webhook',
    ];
}

it('mọi service lõi chat resolve được từ container', function () {
    // Bật tường minh: trên máy đặt INTEGRATION_ZALO_PERSONAL=false thì provider
    // của phích cắm không chạy và test sẽ xanh rỗng.
    config([
        'integrations.zalo_personal.enabled' => true,
        'integrations.payment_manual.enabled' => true,
    ]);

    foreach (chatBootServices() as $class) {
        expect(class_exists($class))->toBeTrue("Class không tồn tại: {$class}");
        expect(app($class))->toBeInstanceOf($class);
    }

    foreach (chatBootSingletons() as $class) {
        expect(app($class))->toBe(app($class), "Mất binding singleton: {$class}");
    }

    // Bảng bí danh gõ sai một ký tự là một no-op hoàn toàn im lặng: worker vẫn
    // chết đúng như khi không có bảng. Bắt cả hai đầu — tên mới phải có thật, và
    // tên cũ phải thật sự dựng lên được qua móc autoloader.
    foreach (require base_path('app/Modules/Chat/compat-aliases.php') as $old => $new) {
        expect(class_exists($new) || interface_exists($new))->toBeTrue("Bí danh trỏ vào hư không: {$new}");
        expect(class_exists($old) || interface_exists($old))->toBeTrue("Bí danh không dựng được tên cũ: {$old}");
    }

    foreach (chatBootControllers() as $controller) {
        expect(app($controller))->toBeInstanceOf($controller);

        foreach ((new ReflectionClass($controller))->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
            foreach ($method->getParameters() as $parameter) {
                $type = $parameter->getType();

                if (! $type instanceof ReflectionNamedType || $type->isBuiltin()) {
                    continue;
                }

                expect(app($type->getName()))->toBeInstanceOf($type->getName());
            }
        }
    }
});

it('gắn tag + ghi note lên conversation vẫn chạy', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'widget',
        'peer_uid' => 'khach_morph',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    // Đường morph khóa bằng CHUỖI alias, không bằng FQCN — nếu một lần di dời
    // làm lệch alias thì `enforceMorphMap` ném ngay tại đây.
    app(TagService::class)->attach($conversation, 'khach-vip');
    $note = app(NoteService::class)->add($conversation, 'khách hỏi giá phòng');

    expect($conversation->fresh()->tags()->pluck('name')->all())->toContain('khach-vip');
    expect($note->noteable_type)->toBe($conversation->getMorphClass());
    expect($note->noteable_id)->toBe($conversation->getKey());
});

it('mọi route inbox đang có vẫn resolve', function () {
    $registered = [];

    foreach (Route::getRoutes() as $route) {
        if ($name = $route->getName()) {
            $registered[$name] = implode('|', $route->methods()).' '.$route->uri();
        }
    }

    foreach (chatBootHttpSurface() as $name => $signature) {
        expect($registered)->toHaveKey($name);
        expect($registered[$name])->toBe($signature);
    }
});
