<?php

use App\Events\MessageReceived;
use App\Models\ChannelUsage;
use App\Models\Conversation;
use App\Models\Lead;
use App\Models\Message;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowRun;
use App\Models\Workspace;
use App\Models\WorkspacePurchase;
use App\Models\WorkspaceSequence;
use App\Modules\Automation\WorkflowEngine;
use App\Modules\Chat\Delivery\DeliveryPipeline;
use App\Modules\Chat\Delivery\OutboundMessage;
use App\Modules\Chat\Port\ChannelCapabilities;
use App\Modules\Chat\Port\ChannelDriver;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Services\EntitlementService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

/**
 * Automation gửi tin: nội dung thật + đếm + KHÔNG mở khóa quota-gate của agent.
 *
 * Ba bất biến bị khóa ở đây:
 *   1. Automation gửi đúng nội dung cấu hình (trước đây gửi tin RỖNG vì lệch key
 *      payload: handler gửi 'body', driver đọc 'text').
 *   2. Automation đi chung DeliveryPipeline → vẫn đếm answered_count.
 *   3. Automation KHÔNG bị quota-gate, nhưng cũng KHÔNG mở khóa gate cho người
 *      gửi tay: hội thoại chỉ được automation chạm vẫn chặn agent khi hết quota.
 *      Nếu thiếu bất biến này, tenant bật một workflow auto-reply là vô hiệu hóa
 *      quota hội thoại mới cho toàn bộ đường gửi tay.
 */
const SMN_CHANNEL = 'content_assert_channel';

const SMN_QUOTA_LIMIT = 5;

class ContentAssertingChannelDriver implements ChannelDriver
{
    /** @var list<array<string, mixed>> */
    public array $sentPayloads = [];

    public function channelKey(): string
    {
        return SMN_CHANNEL;
    }

    public function connect(string $workspaceId, array $params): void {}

    public function disconnect(string $workspaceId): void {}

    public function capabilities(): ChannelCapabilities
    {
        return new ChannelCapabilities;
    }

    public function sendMessage(Conversation $conversation, array $payload): Message
    {
        $this->sentPayloads[] = $payload;

        return Message::create([
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'direction' => 'out',
            'type' => 'text',
            'body' => $payload['text'] ?? null,
            'source_id' => 'content-'.Str::uuid(),
            'platform_sent_at' => now(),
        ]);
    }

    public function parseInbound(array $raw): array
    {
        return [];
    }
}

/**
 * Cấp quota cho kênh test. Bắt buộc: kênh không có quota trong entitlements →
 * limit null → remaining = PHP_INT_MAX → gate không bao giờ bắn, mọi test quota
 * sẽ xanh giả.
 *
 * marketplace_items là bảng admin-plane (app role không có INSERT — đúng thiết
 * kế) → fixture qua privileged, committed; row idempotent theo code.
 */
function smnGrantQuota(Workspace $workspace): void
{
    $privileged = DB::connection('pgsql_privileged');
    $code = 'plan.test.'.SMN_CHANNEL.'.'.SMN_QUOTA_LIMIT;

    $itemId = $privileged->table('marketplace_items')->where('code', $code)->value('id');
    if ($itemId === null) {
        $itemId = (string) Str::uuid();
        $privileged->table('marketplace_items')->insert([
            'id' => $itemId,
            'code' => $code,
            'name' => 'Test '.SMN_CHANNEL,
            'type' => 'plan',
            'billing_type' => 'one_off',
            'price_cents' => 0,
            'currency' => 'VND',
            'is_active' => true,
            'entitlements' => json_encode([
                'flags' => ['module.inbox'],
                'quotas' => ['quota.conversations.'.SMN_CHANNEL => SMN_QUOTA_LIMIT],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    WorkspacePurchase::withoutGlobalScope('workspace')->create([
        'workspace_id' => $workspace->id,
        'item_id' => $itemId,
        'status' => 'active',
        'quantity' => 1,
    ]);

    app(EntitlementService::class)->forgetCache($workspace->id);
}

/** @return array{0: Workspace, 1: User, 2: ContentAssertingChannelDriver} */
function smnSetup(): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');
    actingInWorkspace($workspace, $user);
    smnGrantQuota($workspace);

    $driver = new ContentAssertingChannelDriver;
    app(ChannelRegistry::class)->extend(SMN_CHANNEL, fn () => $driver);

    return [$workspace, $user, $driver];
}

/** Đốt sạch quota kỳ hiện tại. updateOrInsert vì meterReply có thể đã tạo row. */
function smnExhaustQuota(Workspace $workspace): void
{
    DB::table('channel_usage')->updateOrInsert(
        [
            'workspace_id' => $workspace->id,
            'channel' => SMN_CHANNEL,
            'period' => now('Asia/Ho_Chi_Minh')->format('Y-m'),
        ],
        [
            'id' => (string) Str::orderedUuid(),
            'answered_count' => SMN_QUOTA_LIMIT,
            'created_at' => now(),
            'updated_at' => now(),
        ],
    );

    app(EntitlementService::class)->forgetCache($workspace->id);
}

function smnConversation(Workspace $workspace, ?string $leadId = null): Conversation
{
    return Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => SMN_CHANNEL,
        'peer_uid' => 'peer-'.Str::uuid(),
        'thread_type' => 0,
        'lead_id' => $leadId,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
}

/** Chạy workflow send_message trên subject lead — đường automation THẬT. */
function smnRunAutomation(Lead $lead, string $body): WorkflowRun
{
    $workflow = Workflow::factory()->create([
        'graph' => [
            'nodes' => [
                ['id' => 'n_start', 'type' => 'start', 'config' => []],
                ['id' => 'n_action', 'type' => 'send_message', 'config' => [
                    'channel' => SMN_CHANNEL,
                    'body' => $body,
                ]],
                ['id' => 'n_end', 'type' => 'end', 'config' => []],
            ],
            'edges' => [
                ['from' => 'n_start', 'to' => 'n_action', 'branch' => null],
                ['from' => 'n_action', 'to' => 'n_end', 'branch' => null],
            ],
        ],
    ]);

    return app(WorkflowEngine::class)->enroll($workflow, 'lead', $lead->id);
}

// ── 1. Nội dung tin ───────────────────────────────────────────────────────────

it('automation gửi tin có nội dung, không gửi tin rỗng', function () {
    [$workspace, $user, $driver] = smnSetup();
    $lead = Lead::factory()->create();
    smnConversation($workspace, $lead->id);

    $run = smnRunAutomation($lead, 'Xin chào, shop hỗ trợ gì được ạ?');
    actingInWorkspace($workspace, $user);

    expect($run->refresh()->status)->toBe(WorkflowRun::STATUS_COMPLETED);

    $message = Message::withoutGlobalScope('workspace')
        ->where('workspace_id', $workspace->id)
        ->latest('id')
        ->first();

    expect($message)->not->toBeNull()
        ->and($message->body)->toBe('Xin chào, shop hỗ trợ gì được ạ?')
        ->and($driver->sentPayloads[0]['text'])->toBe('Xin chào, shop hỗ trợ gì được ạ?');
});

it('automation KHÔNG gửi khi nội dung node để trống — báo failed thay vì gửi tin trắng', function () {
    [$workspace, $user, $driver] = smnSetup();
    $lead = Lead::factory()->create();
    smnConversation($workspace, $lead->id);

    $run = smnRunAutomation($lead, '   ');
    actingInWorkspace($workspace, $user);

    expect($run->refresh()->status)->toBe(WorkflowRun::STATUS_FAILED)
        ->and($driver->sentPayloads)->toBeEmpty();
});

// ── 2. Đếm ────────────────────────────────────────────────────────────────────

it('automation vẫn tăng answered_count (đi chung DeliveryPipeline)', function () {
    [$workspace, $user] = smnSetup();
    $lead = Lead::factory()->create();
    smnConversation($workspace, $lead->id);

    smnRunAutomation($lead, 'tin tự động');
    actingInWorkspace($workspace, $user);

    $usage = ChannelUsage::withoutGlobalScope('workspace')
        ->where('workspace_id', $workspace->id)
        ->where('channel', SMN_CHANNEL)
        ->where('period', now('Asia/Ho_Chi_Minh')->format('Y-m'))
        ->first();

    expect($usage)->not->toBeNull()
        ->and((int) $usage->answered_count)->toBe(1);
});

// ── 3. Không chặn, chỉ thống kê ───────────────────────────────────────────────

it('automation vượt mức dùng vẫn gửi được', function () {
    [$workspace, $user, $driver] = smnSetup();
    smnExhaustQuota($workspace);

    $lead = Lead::factory()->create();
    smnConversation($workspace, $lead->id);

    $run = smnRunAutomation($lead, 'vẫn gửi được dù đã vượt mức');
    actingInWorkspace($workspace, $user);

    expect($run->refresh()->status)->toBe(WorkflowRun::STATUS_COMPLETED)
        ->and($driver->sentPayloads)->toHaveCount(1);
});

it('người gửi tay vượt mức dùng VẪN gửi được — không còn gate hạn mức', function () {
    [$workspace, , $driver] = smnSetup();
    smnExhaustQuota($workspace);

    $conversation = smnConversation($workspace);

    $message = app(DeliveryPipeline::class)->send(
        $driver,
        $conversation,
        OutboundMessage::text('agent gửi tay khi đã vượt mức'),
    );

    expect($message->direction)->toBe('out')
        ->and($driver->sentPayloads)->toHaveCount(1);
});

it('vượt mức vẫn tiếp tục cộng dồn thống kê — số liệu không bị kẹp trần', function () {
    [$workspace, , $driver] = smnSetup();
    $pipeline = app(DeliveryPipeline::class);

    // Gửi nhiều hội thoại hơn hạn mức danh nghĩa
    for ($i = 0; $i < SMN_QUOTA_LIMIT + 2; $i++) {
        $pipeline->send($driver, smnConversation($workspace), OutboundMessage::text('tin '.$i));
    }

    $usage = ChannelUsage::withoutGlobalScope('workspace')
        ->where('workspace_id', $workspace->id)
        ->where('channel', SMN_CHANNEL)
        ->where('period', now('Asia/Ho_Chi_Minh')->format('Y-m'))
        ->first();

    expect((int) $usage->answered_count)->toBe(SMN_QUOTA_LIMIT + 2);
});

// ── 4. Broadcast ──────────────────────────────────────────────────────────────

it('automation phát MessageReceived + cập nhật preview hội thoại', function () {
    Event::fake([MessageReceived::class]);

    [$workspace, $user] = smnSetup();
    $lead = Lead::factory()->create();
    $conversation = smnConversation($workspace, $lead->id);

    smnRunAutomation($lead, 'tin tự động có broadcast');
    actingInWorkspace($workspace, $user);

    Event::assertDispatched(MessageReceived::class);
    expect($conversation->refresh()->last_message_preview)->toContain('tin tự động có broadcast');
});
