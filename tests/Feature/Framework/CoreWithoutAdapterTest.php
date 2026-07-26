<?php

use App\Events\MessageReceived;
use App\Models\ChannelAccount;
use App\Models\ChannelUsage;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Chat\Adapter\Widget\WidgetChannelDriver;
use App\Modules\Chat\Delivery\Event\Action;
use App\Modules\Chat\Delivery\Event\ActionsEvent;
use App\Modules\Chat\Delivery\Event\CardEvent;
use App\Modules\Chat\Delivery\Event\OutboundEventType;
use App\Modules\Chat\Delivery\Event\TextEvent;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Integration\Data\OutboundMessage;
use App\Services\InboundMessageService;
use App\Services\Inbox\OutboundSendPipeline;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

/**
 * PHÉP THỬ 0 — bài nghiệm thu mạnh nhất của cả plan.
 *
 * Tắt Zalo hoàn toàn ⇒ vẫn gửi và nhận được tin. Lõi sống được với KHÔNG phích
 * cắm ngoài nào thì nó sống được với bất kỳ phích cắm nào — chứng minh mạnh hơn
 * "thêm được kênh thứ hai" nhiều.
 *
 * Trước pha này, gỡ Zalo ra là chat chết hẳn: pipeline bắt buộc có driver,
 * route nhận tin duy nhất nằm trong `if (config(...zalo_personal.enabled))`, và
 * registry rỗng đẩy inbox vào empty state.
 */
function cwaSetup(): array
{
    config(['integrations.zalo_personal.enabled' => false]);
    config(['integrations.widget.inbound_secret' => 'secret-cho-test']);

    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => WidgetChannelDriver::KEY,
        'account_uid' => 'widget_'.uniqid(),
        'status' => 'connected',
    ]);

    return [$workspace, $user, $account];
}

/**
 * Fixture CỐ ĐỊNH, committed ngoài transaction của test.
 *
 * Controller tra tài khoản kênh bằng connection `pgsql_privileged` (chưa biết
 * workspace nên chưa có ngữ cảnh RLS) — connection đó KHÔNG thấy dữ liệu đang
 * nằm trong transaction của test. Dùng uuid cố định + upsert nên chạy bao nhiêu
 * lần cũng chỉ có một hàng: không tích tụ rác, không cần dọn.
 *
 * Không dọn là CỐ Ý: xóa `workspaces` trong khi transaction của test còn giữ
 * hàng `conversations` tham chiếu tới nó sẽ chờ khóa vô hạn (đã thử, treo).
 *
 * @return array{0: string, 1: string} [workspaceId, channelAccountId]
 */
function cwaFixedFixture(): array
{
    $workspaceId = '00000000-0000-4000-8000-0000000000c1';
    $accountId = '00000000-0000-4000-8000-0000000000c2';
    $priv = DB::connection('pgsql_privileged');

    $priv->table('workspaces')->updateOrInsert(
        ['id' => $workspaceId],
        ['name' => 'widget-inbound-fixture', 'slug' => 'widget-inbound-fixture', 'created_at' => now(), 'updated_at' => now()],
    );
    $priv->table('channel_accounts')->updateOrInsert(
        ['id' => $accountId],
        [
            'workspace_id' => $workspaceId,
            'channel' => WidgetChannelDriver::KEY,
            'account_uid' => 'widget-inbound-fixture',
            'status' => 'connected',
            'created_at' => now(),
            'updated_at' => now(),
        ],
    );

    return [$workspaceId, $accountId];
}

it('registry vẫn có kênh nội bộ khi Zalo đã tắt', function () {
    cwaSetup();

    $channels = app(ChannelRegistry::class);

    expect($channels->hasAny())->toBeTrue();
    expect($channels->driver(WidgetChannelDriver::KEY))->toBeInstanceOf(WidgetChannelDriver::class);
});

it('nhận được tin qua kênh nội bộ khi Zalo đã tắt', function () {
    [$workspace, , $account] = cwaSetup();

    // Đi đúng một điểm nhập với webhook Zalo: driver dịch payload → IntakeService.
    // Không dựng đường ingest riêng nào cho kênh nội bộ.
    $normalized = app(ChannelRegistry::class)->driver(WidgetChannelDriver::KEY)->parseInbound([
        'channel_account_id' => $account->id,
        'visitor_id' => 'khach_001',
        'body' => 'cho hỏi còn phòng không ạ',
        'source_id' => 'w_001',
    ]);

    expect($normalized['channel'])->toBe(WidgetChannelDriver::KEY);
    expect($normalized['direction'])->toBe('in');

    $message = app(InboundMessageService::class)->ingest($normalized);

    $conversation = Conversation::where('workspace_id', $workspace->id)
        ->where('channel', WidgetChannelDriver::KEY)
        ->first();

    expect($conversation)->not->toBeNull();
    expect($conversation->peer_uid)->toBe('khach_001');
    expect($message->direction)->toBe('in');
    expect($message->body)->toBe('cho hỏi còn phòng không ạ');
});

it('POST /api/channels/widget/inbound tạo hội thoại + tin THẬT trong DB', function () {
    config(['integrations.zalo_personal.enabled' => false]);
    config(['integrations.widget.inbound_secret' => 'secret-cho-test']);

    [$workspaceId, $accountId] = cwaFixedFixture();
    $visitorId = 'khach_http_'.uniqid();
    $sourceId = 'w_http_'.uniqid();

    $this->withHeader('X-Yona-Channel-Secret', 'secret-cho-test')
        ->postJson(route('channels.widget.inbound'), [
            'channel_account_id' => $accountId,
            'visitor_id' => $visitorId,
            'body' => 'cho hỏi còn phòng không ạ',
            'source_id' => $sourceId,
        ])
        ->assertCreated()
        ->assertJsonPath('ok', true);

    // Truy vấn DB THẬT. Phải bind ngữ cảnh workspace: RLS nằm ở tầng Postgres,
    // `withoutGlobalScopes()` chỉ gỡ scope của Eloquent nên không thấy gì.
    // Đọc được ở đây cũng chính là bằng chứng tin đã vào ĐÚNG workspace suy ra
    // từ tài khoản kênh, không phải workspace nào client gửi lên.
    TenantScope::runScoped($workspaceId, function () use ($workspaceId, $accountId, $visitorId, $sourceId) {
        $conversation = Conversation::where('workspace_id', $workspaceId)
            ->where('channel', WidgetChannelDriver::KEY)
            ->where('peer_uid', $visitorId)
            ->first();

        expect($conversation)->not->toBeNull();
        expect($conversation->channel_account_id)->toBe($accountId);

        $message = Message::where('conversation_id', $conversation->id)
            ->where('source_id', $sourceId)
            ->first();

        expect($message)->not->toBeNull();
        expect($message->direction)->toBe('in');
        expect($message->body)->toBe('cho hỏi còn phòng không ạ');
    });
});

it('đường vào HTTP khử trùng theo source_id — gửi lại KHÔNG đẻ tin thứ hai', function () {
    config(['integrations.widget.inbound_secret' => 'secret-cho-test']);

    [$workspaceId, $accountId] = cwaFixedFixture();
    $visitorId = 'khach_dup_'.uniqid();
    $sourceId = 'w_dup_'.uniqid();

    $payload = [
        'channel_account_id' => $accountId,
        'visitor_id' => $visitorId,
        'body' => 'tin bị gửi lại',
        'source_id' => $sourceId,
    ];

    $this->withHeader('X-Yona-Channel-Secret', 'secret-cho-test')
        ->postJson(route('channels.widget.inbound'), $payload)->assertCreated();
    $this->withHeader('X-Yona-Channel-Secret', 'secret-cho-test')
        ->postJson(route('channels.widget.inbound'), $payload)->assertCreated();

    TenantScope::runScoped($workspaceId, function () use ($workspaceId, $visitorId, $sourceId) {
        $conversation = Conversation::where('workspace_id', $workspaceId)
            ->where('peer_uid', $visitorId)
            ->first();

        expect($conversation)->not->toBeNull();
        expect(Message::where('conversation_id', $conversation->id)
            ->where('source_id', $sourceId)
            ->count())->toBe(1);
    });
});

it('đường vào HTTP từ chối tài khoản kênh không tồn tại', function () {
    config(['integrations.widget.inbound_secret' => 'secret-cho-test']);

    $this->withHeader('X-Yona-Channel-Secret', 'secret-cho-test')
        ->postJson(route('channels.widget.inbound'), [
            'channel_account_id' => (string) Str::uuid(),
            'visitor_id' => 'khach_ma',
            'body' => 'xin chào',
        ])
        ->assertNotFound()
        ->assertJsonPath('error_code', 'channel_account_not_found');
});

it('đường vào từ chối request thiếu secret', function () {
    [, , $account] = cwaSetup();

    // Không cần fixture committed: secret bị chặn TRƯỚC khi chạm DB.
    $this->postJson(route('channels.widget.inbound'), [
        'channel_account_id' => $account->id,
        'visitor_id' => 'khach_002',
        'body' => 'xin chào',
    ])->assertStatus(401);
});

it('agent gửi được tin trong hội thoại nội bộ khi Zalo đã tắt', function () {
    [$workspace, , $account] = cwaSetup();

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => WidgetChannelDriver::KEY,
        'channel_account_id' => $account->id,
        'peer_uid' => 'khach_003',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $channels = app(ChannelRegistry::class);

    $message = app(OutboundSendPipeline::class)->send(
        $channels->driver(WidgetChannelDriver::KEY),
        $conversation,
        OutboundMessage::text('còn phòng ạ'),
    );

    expect($message)->toBeInstanceOf(Message::class);
    expect($message->direction)->toBe('out');
    expect($message->body)->toBe('còn phòng ạ');
    expect($message->source_id)->toStartWith('widget_');
});

it('kênh nội bộ render được MỌI loại sự kiện, không hạ cấp', function () {
    [$workspace, , $account] = cwaSetup();

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => WidgetChannelDriver::KEY,
        'channel_account_id' => $account->id,
        'peer_uid' => 'khach_004',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $driver = app(ChannelRegistry::class)->driver(WidgetChannelDriver::KEY);

    expect($driver->supportedOutboundEvents())
        ->toEqualCanonicalizing(OutboundEventType::cases());

    $message = app(OutboundSendPipeline::class)->send($driver, $conversation, OutboundMessage::events([
        new TextEvent('Phòng còn trống ạ'),
        new CardEvent(title: 'Deluxe', subtitle: '1.2 triệu/đêm'),
        new ActionsEvent([new Action('book', 'Đặt ngay')]),
    ]));

    expect($message->body)->toBe("Phòng còn trống ạ\nDeluxe — 1.2 triệu/đêm\nĐặt ngay");
});

it('tin kênh nội bộ vẫn được thống kê và phát realtime — không ngoại lệ nào', function () {
    [$workspace, , $account] = cwaSetup();
    Event::fake([MessageReceived::class]);

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => WidgetChannelDriver::KEY,
        'channel_account_id' => $account->id,
        'peer_uid' => 'khach_005',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    app(OutboundSendPipeline::class)->send(
        app(ChannelRegistry::class)->driver(WidgetChannelDriver::KEY),
        $conversation,
        OutboundMessage::text('đã ghi nhận ạ'),
    );

    // Bộ đếm chạy như mọi kênh: kênh nội bộ KHÔNG có nhánh riêng nào trong lõi.
    expect(ChannelUsage::where('workspace_id', $workspace->id)
        ->where('channel', WidgetChannelDriver::KEY)
        ->value('answered_count'))->toBe(1);

    Event::assertDispatched(MessageReceived::class);
});

it('inbox KHÔNG rơi vào empty state khi chỉ còn kênh nội bộ', function () {
    cwaSetup();

    $this->get(route('inbox.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('channelsAvailable', true));
});
