<?php

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Modules\Chat\Adapter\Widget\WidgetChannelDriver;
use App\Modules\Chat\Delivery\SeenSyncService;
use App\Modules\Chat\Intake\IntakeService;
use App\Services\SettingsService;
use App\Support\TenantScope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * `thread_kind` thay `thread_type`: đọc là hiểu, và không khóa cứng ở hai giá trị.
 *
 * Cột số nguyên `thread_type` là ngôn ngữ của Zalo. Nó chỉ được sống ở lớp dịch
 * của phích cắm; mọi tầng khác nói `direct` / `group`.
 */
function tkSetup(): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => WidgetChannelDriver::KEY,
        'account_uid' => 'acc_'.uniqid(),
        'status' => 'connected',
    ]);

    return [$workspace, $user, $account];
}

function tkConversation(Workspace $workspace, string $kind, ?ChannelAccount $account = null): Conversation
{
    return Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => WidgetChannelDriver::KEY,
        'channel_account_id' => $account?->id,
        'sender_uid' => 'uid_'.Str::random(6),
        'thread_type' => $kind === 'group' ? 1 : 0,
        'thread_kind' => $kind,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
}

it('tiếp nhận tin nhóm thì ghi thread_kind=group', function () {
    [$workspace, , $account] = tkSetup();

    $message = app(IntakeService::class)->ingest([
        'channel' => WidgetChannelDriver::KEY,
        'channel_account_id' => $account->id,
        'thread_uid' => 'nhom_001',
        'thread_kind' => 'group',
        'direction' => 'in',
        'source_id' => 'g_'.Str::random(6),
        'type' => 'text',
        'body' => 'cả nhà ơi',
        'platform_meta' => [],
        'media_meta' => [],
    ]);

    expect($message->conversation->thread_kind)->toBe('group');
});

it('tiếp nhận tin nhắn riêng thì ghi thread_kind=direct', function () {
    [$workspace, , $account] = tkSetup();

    $message = app(IntakeService::class)->ingest([
        'channel' => WidgetChannelDriver::KEY,
        'channel_account_id' => $account->id,
        'thread_uid' => 'khach_001',
        'thread_kind' => 'direct',
        'direction' => 'in',
        'source_id' => 'd_'.Str::random(6),
        'type' => 'text',
        'body' => 'cho hỏi giá',
        'platform_meta' => [],
        'media_meta' => [],
    ]);

    expect($message->conversation->thread_kind)->toBe('direct');
});

it('đồng bộ đã-xem bỏ qua hội thoại nhóm theo thread_kind', function () {
    [$workspace] = tkSetup();
    $group = tkConversation($workspace, 'group');

    // Cột số nguyên cũ cố tình để SAI. Nếu service còn đọc nó thì test đỏ —
    // đó chính là điều cần chứng minh.
    Conversation::where('id', $group->id)->update(['thread_type' => 0]);

    // Bật tường minh: mặc định tắt thì service thoát ngay ở dòng đầu và test
    // xanh mà chưa hề chạm tới việc phân biệt nhóm.
    app(SettingsService::class)->set(SeenSyncService::SETTING_KEY.'.'.WidgetChannelDriver::KEY, true);
    expect(app(SeenSyncService::class)->enabled(WidgetChannelDriver::KEY))->toBeTrue();

    Http::fake();
    app(SeenSyncService::class)->syncOnThreadOpen($group->fresh());
    Http::assertNothingSent();
});

it('không cho tạo Lead từ hội thoại nhóm theo thread_kind', function () {
    [$workspace] = tkSetup();
    $group = tkConversation($workspace, 'group');
    Conversation::where('id', $group->id)->update(['thread_type' => 0]);

    $this->postJson(route('inbox.lead.store', $group->id), ['name' => 'Khách nhóm'])
        ->assertStatus(422);
});

it('lệnh điền dữ liệu chạy sai role thì KHÔNG ĐỘNG được hàng nào — và không báo lỗi', function () {
    [$workspace] = tkSetup();
    $conversation = tkConversation($workspace, 'group');

    $sql = "UPDATE conversations SET thread_kind = 'direct' WHERE id = ?";

    // Connection mặc định chạy dưới role KHÔNG có BYPASSRLS. Migration chạy
    // ngoài ngữ cảnh request nên không có `app.current_workspace` — vị từ RLS
    // thành NULL, không hàng nào nhìn thấy được. Postgres báo THÀNH CÔNG với 0
    // hàng: không lỗi, không cảnh báo, thoát 0.
    //
    // Đây là lý do migration điền dữ liệu phải ghim `pgsql_privileged` VÀ phải
    // đếm lại hàng rỗng sau khi chạy. Không có bước đếm đó thì một đợt điền
    // "thành công" có thể đã không làm gì cả.
    //
    // Test dựng lại cái bẫy bằng ngữ cảnh workspace thay vì đổi role: hai role
    // là hai session, mà session khác không thấy được hàng đang nằm trong
    // transaction của test. Vị từ RLS bị vô hiệu theo đúng một cách ở cả hai
    // đường — không có `app.current_workspace` thì không hàng nào hiện ra.
    setWorkspaceContext(null);
    expect(DB::connection('pgsql')->update($sql, [$conversation->id]))->toBe(0);

    // Đọc lại phải khôi phục ngữ cảnh, vì cùng vị từ RLS cũng giấu hàng khỏi
    // chính test này — đó là bằng chứng rằng vị từ đang có hiệu lực thật.
    setWorkspaceContext($workspace->id);
    expect($conversation->fresh()->thread_kind)->toBe('group');

    // Cùng câu lệnh đó, có ngữ cảnh, thì chạm được hàng. Khác biệt duy nhất là
    // vị từ RLS — không phải câu SQL, không phải quyền bảng.
    expect(DB::connection('pgsql')->update($sql, [$conversation->id]))->toBe(1);
    expect($conversation->fresh()->thread_kind)->toBe('direct');
});

it('mọi hội thoại đang có đều mang thread_kind — không dòng nào rỗng', function () {
    $remaining = DB::connection('pgsql_privileged')
        ->table('conversations')->whereNull('thread_kind')->count();

    expect($remaining)->toBe(0);
})->skip(fn () => ! DB::connection('pgsql_privileged')->getSchemaBuilder()->hasColumn('conversations', 'thread_kind'), 'Cột chưa tồn tại');

it('kéo lịch sử vẫn tìm được hội thoại nhóm', function () {
    [$workspace, , $account] = tkSetup();
    $group = tkConversation($workspace, 'group', $account);
    Conversation::where('id', $group->id)->update(['thread_type' => 0]);

    // Truy vấn của việc kéo lịch sử là SQL thô — PHPStan không soi được, nên
    // đây là chỗ duy nhất canh nó.
    $found = TenantScope::runScoped($workspace->id, fn () => DB::table('conversations')
        ->where('workspace_id', $workspace->id)
        ->where('thread_kind', 'group')
        ->pluck('id')->all());

    expect($found)->toContain($group->id);
});
