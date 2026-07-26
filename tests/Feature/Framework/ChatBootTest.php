<?php

use App\Models\Conversation;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Chat\Adapter\Widget\Intake\WidgetInboundParser;
use App\Modules\Chat\Adapter\Widget\WidgetChannelDriver;
use App\Modules\Chat\Delivery\InteractionPipeline;
use App\Modules\Integration\ChannelManager;
use App\Modules\Integration\Chat\ZaloPersonal\SendRateLimiter;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloChannelDriver;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloHealthMonitor;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloInteractionService;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloSendService;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloStateEventParser;
use App\Modules\Integration\IntegrationCatalog;
use App\Modules\Integration\PaymentManager;
use App\Services\InboundMessageService;
use App\Services\Inbox\MessageItemSerializer;
use App\Services\Inbox\MessagePublisher;
use App\Services\Inbox\MessageSourceResolver;
use App\Services\Inbox\MessageStateService;
use App\Services\Inbox\OutboundSendPipeline;
use App\Services\Inbox\PhoneEnrichmentService;
use App\Services\Inbox\SeenSyncService;
use App\Services\Inbox\SessionGapMaterializer;
use App\Services\Inbox\SocialEventMaterializer;
use App\Services\Inbox\StreamCursor;
use App\Services\NoteService;
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
        InboundMessageService::class,
        MessageItemSerializer::class,
        MessagePublisher::class,
        MessageSourceResolver::class,
        MessageStateService::class,
        OutboundSendPipeline::class,
        PhoneEnrichmentService::class,
        SeenSyncService::class,
        SessionGapMaterializer::class,
        SocialEventMaterializer::class,
        StreamCursor::class,
        InteractionPipeline::class,

        // Cổng cắm + sổ đăng ký
        ChannelManager::class,
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
    foreach (chatBootServices() as $class) {
        expect(class_exists($class))->toBeTrue("Class không tồn tại: {$class}");
        expect(app($class))->toBeInstanceOf($class);
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
