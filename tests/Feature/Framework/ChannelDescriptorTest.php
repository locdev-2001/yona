<?php

use App\Enums\TenantPermission;
use App\Http\ViewModels\IntegrationCatalog;
use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Models\ZaloConnection;
use App\Modules\Chat\Adapter\Widget\WidgetChannelDriver;
use App\Modules\Chat\Port\ChannelDescriptor;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Services\EntitlementService;
use Tests\Support\MockChannelDriverA;

/**
 * Descriptor là thứ thay cho mọi literal tên kênh trong lõi và giao diện.
 *
 * Bộ test này canh đúng một câu hỏi: sau pha này, thêm một kênh mới có phải sửa
 * dòng nào trong lõi hay FE không. Nếu có thì descriptor chưa đủ.
 */
function cdSetup(string $role = 'admin'): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, $role);

    return [$workspace, $user];
}

function cdRegisterMock(): MockChannelDriverA
{
    $driver = new MockChannelDriverA;
    app(ChannelRegistry::class)->extend('mock_a', fn () => $driver);

    return $driver;
}

it('mọi driver khai descriptor đủ field', function () {
    cdSetup();
    cdRegisterMock();

    $descriptors = app(ChannelRegistry::class)->descriptors();

    expect($descriptors)->not->toBeEmpty();

    foreach ($descriptors as $key => $descriptor) {
        expect($descriptor)->toBeInstanceOf(ChannelDescriptor::class)
            ->and($descriptor->key)->toBe($key)
            ->and($descriptor->label)->not->toBe('')
            ->and($descriptor->category)->not->toBe('')
            ->and($descriptor->badge)->not->toBe('')
            ->and($descriptor->managePermission)->toBeInstanceOf(TenantPermission::class);
    }
});

it('quotaKey của descriptor khớp khóa mà EntitlementService dùng', function () {
    cdSetup();
    cdRegisterMock();

    // Nếu hai chỗ dựng khóa theo hai công thức, giao diện sẽ hiện hạn mức của
    // kênh khác mà không có gì báo lỗi.
    foreach (app(ChannelRegistry::class)->descriptors() as $descriptor) {
        expect($descriptor->quotaKey())->toBe(EntitlementService::quotaKeyForChannel($descriptor->key));
    }
});

it('trang tích hợp sinh card từ descriptor — thêm kênh mock là có card mock', function () {
    cdSetup();
    cdRegisterMock();

    $keys = collect(app(IntegrationCatalog::class)->cards())->pluck('key')->all();

    expect($keys)->toContain('mock_a')
        ->and($keys)->toContain('zalo_personal')
        ->and($keys)->toContain(WidgetChannelDriver::KEY);
});

it('kênh tắt trong config vẫn còn card, chỉ là enabled=false', function () {
    cdSetup();
    config(['integrations.zalo_personal.enabled' => false]);

    $card = collect(app(IntegrationCatalog::class)->cards())->firstWhere('key', 'zalo_personal');

    // Biến mất khỏi trang thì người dùng không còn đường nào bật lại.
    expect($card)->not->toBeNull()
        ->and($card['enabled'])->toBeFalse();
});

it('có ZaloConnection nhưng chưa có ChannelAccount connected thì connected=false', function () {
    [$workspace] = cdSetup();

    // Phiên đã hỏng vẫn để lại hàng kết nối — đúng tình huống mà cách đếm cũ
    // (`ZaloConnection::exists()`) báo "đã kết nối" trong khi kênh không nhận
    // được tin nào.
    $connection = new ZaloConnection;
    $connection->workspace_id = $workspace->id;
    $connection->connection_id = random_int(100000, 999999);
    $connection->state = 'session_lost';
    $connection->save();

    $card = collect(app(IntegrationCatalog::class)->cards())->firstWhere('key', 'zalo_personal');
    expect($card['connected'])->toBeFalse();

    ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'z_'.uniqid(),
        'status' => 'connected',
    ]);

    $card = collect(app(IntegrationCatalog::class)->cards())->firstWhere('key', 'zalo_personal');
    expect($card['connected'])->toBeTrue();
});

it('trang inbox đẩy descriptor của kênh xuống FE', function () {
    cdSetup();

    $this->get(route('inbox.index'))
        ->assertOk()
        ->assertInertia(function ($page) {
            $descriptors = $page->toArray()['props']['channelDescriptors'];

            expect($descriptors)->toHaveKey('zalo_personal');
            expect($descriptors['zalo_personal'])->toHaveKeys(['key', 'label', 'badge', 'connectRouteName', 'quotaKey']);
        });
});

it('thành viên không có quyền quản trị kênh thì bị chặn ở thao tác lên tin', function () {
    // Vai admin của workspace đi qua MỌI kiểm tra quyền (Gate::before), nên test
    // quyền mà seed admin là test rỗng. Phải dùng vai thấp.
    [$workspace, $user] = cdSetup('sales_rep');

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => WidgetChannelDriver::KEY,
        'peer_uid' => 'khach_quyen',
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $message = Message::create([
        'workspace_id' => $workspace->id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => 'xin chào',
        'source_id' => 'src_quyen',
    ]);

    expect($user->can(TenantPermission::ZaloManage->value))->toBeFalse();

    $this->postJson(route('inbox.reaction', [$conversation->id, $message->id]), ['icon' => '/-strong'])
        ->assertForbidden();
});
