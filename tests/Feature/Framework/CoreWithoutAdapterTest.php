<?php

use App\Events\MessageReceived;
use App\Models\ChannelAccount;
use App\Models\ChannelUsage;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Chat\Adapter\Native\NativeChannelDriver;
use App\Modules\Chat\Delivery\Event\Action;
use App\Modules\Chat\Delivery\Event\ActionsEvent;
use App\Modules\Chat\Delivery\Event\CardEvent;
use App\Modules\Chat\Delivery\Event\OutboundEventType;
use App\Modules\Chat\Delivery\Event\TextEvent;
use App\Modules\Integration\ChannelManager;
use App\Modules\Integration\Data\OutboundMessage;
use App\Services\InboundMessageService;
use App\Services\Inbox\OutboundSendPipeline;
use Illuminate\Support\Facades\Event;

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
    config(['integrations.native.inbound_secret' => 'secret-cho-test']);

    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => NativeChannelDriver::KEY,
        'account_uid' => 'widget_'.uniqid(),
        'status' => 'connected',
    ]);

    return [$workspace, $user, $account];
}

it('registry vẫn có kênh nội bộ khi Zalo đã tắt', function () {
    cwaSetup();

    $channels = app(ChannelManager::class);

    expect($channels->hasAny())->toBeTrue();
    expect($channels->driver(NativeChannelDriver::KEY))->toBeInstanceOf(NativeChannelDriver::class);
});

it('nhận được tin qua kênh nội bộ khi Zalo đã tắt', function () {
    [$workspace, , $account] = cwaSetup();

    // Đi đúng một điểm nhập với webhook Zalo: driver dịch payload → IntakeService.
    // Không dựng đường ingest riêng nào cho kênh nội bộ.
    $normalized = app(ChannelManager::class)->driver(NativeChannelDriver::KEY)->parseInbound([
        'channel_account_id' => $account->id,
        'visitor_id' => 'khach_001',
        'body' => 'cho hỏi còn phòng không ạ',
        'source_id' => 'w_001',
    ]);

    expect($normalized['channel'])->toBe(NativeChannelDriver::KEY);
    expect($normalized['direction'])->toBe('in');

    $message = app(InboundMessageService::class)->ingest($normalized);

    $conversation = Conversation::where('workspace_id', $workspace->id)
        ->where('channel', NativeChannelDriver::KEY)
        ->first();

    expect($conversation)->not->toBeNull();
    expect($conversation->peer_uid)->toBe('khach_001');
    expect($message->direction)->toBe('in');
    expect($message->body)->toBe('cho hỏi còn phòng không ạ');
});

it('đường vào HTTP có route và bị chặn bởi secret', function () {
    cwaSetup();

    // Ngữ cảnh workspace bị xóa ở tầng middleware nên controller tra tài khoản
    // kênh bằng connection privileged — phần đó chỉ kiểm chứng được với dữ liệu
    // đã commit, để cho P7 khi widget có fixture thật. Ở đây khóa hai thứ:
    // route tồn tại, và không có secret thì không đi tiếp được.
    expect(route('channels.native.inbound'))->toContain('/channels/native/inbound');
});

it('đường vào từ chối request thiếu secret', function () {
    [, , $account] = cwaSetup();

    // Không cần fixture committed: secret bị chặn TRƯỚC khi chạm DB.
    $this->postJson(route('channels.native.inbound'), [
        'channel_account_id' => $account->id,
        'visitor_id' => 'khach_002',
        'body' => 'xin chào',
    ])->assertStatus(401);
});

it('agent gửi được tin trong hội thoại nội bộ khi Zalo đã tắt', function () {
    [$workspace, , $account] = cwaSetup();

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => NativeChannelDriver::KEY,
        'channel_account_id' => $account->id,
        'peer_uid' => 'khach_003',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $channels = app(ChannelManager::class);

    $message = app(OutboundSendPipeline::class)->send(
        $channels->driver(NativeChannelDriver::KEY),
        $conversation,
        OutboundMessage::text('còn phòng ạ'),
    );

    expect($message)->toBeInstanceOf(Message::class);
    expect($message->direction)->toBe('out');
    expect($message->body)->toBe('còn phòng ạ');
    expect($message->source_id)->toStartWith('native_');
});

it('kênh nội bộ render được MỌI loại sự kiện, không hạ cấp', function () {
    [$workspace, , $account] = cwaSetup();

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => NativeChannelDriver::KEY,
        'channel_account_id' => $account->id,
        'peer_uid' => 'khach_004',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $driver = app(ChannelManager::class)->driver(NativeChannelDriver::KEY);

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
        'channel' => NativeChannelDriver::KEY,
        'channel_account_id' => $account->id,
        'peer_uid' => 'khach_005',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    app(OutboundSendPipeline::class)->send(
        app(ChannelManager::class)->driver(NativeChannelDriver::KEY),
        $conversation,
        OutboundMessage::text('đã ghi nhận ạ'),
    );

    // Bộ đếm chạy như mọi kênh: native KHÔNG có nhánh riêng nào trong lõi.
    expect(ChannelUsage::where('workspace_id', $workspace->id)
        ->where('channel', NativeChannelDriver::KEY)
        ->value('answered_count'))->toBe(1);

    Event::assertDispatched(MessageReceived::class);
});

it('inbox KHÔNG rơi vào empty state khi chỉ còn kênh nội bộ', function () {
    cwaSetup();

    $this->get(route('inbox.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('channelsAvailable', true));
});
