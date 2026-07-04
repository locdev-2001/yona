<?php

use App\Models\Attachment;
use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageSourceAlias;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Models\ZaloConnection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * P04 — composer media: upload (validate + private disk) → send (signed URL cho
 * bridge, display URL bền cho chat) → alias 2-msgId → prune bảng tạm.
 */

// ── Helpers (tên riêng — tránh đụng global helpers của test khác) ────────────

function cmSetup(): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'peer_media_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    return [$workspace, $user, $conversation];
}

/** Gắn channel_account + slot connected để ZaloSendService resolve được. */
function cmConnectSlot(Workspace $workspace, Conversation $conversation): void
{
    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_media_'.uniqid(),
        'status' => 'connected',
    ]);

    ZaloConnection::create([
        'workspace_id' => $workspace->id,
        'connection_id' => ZaloConnection::nextConnectionId(),
        'channel_account_id' => $account->id,
        'state' => 'connected',
        'lock_version' => 0,
    ]);

    $conversation->update(['channel_account_id' => $account->id]);
}

// ── Upload ───────────────────────────────────────────────────────────────────

it('upload ảnh trả attachment_id + media_kind image, lưu private disk, morph conversation', function () {
    Storage::fake(config('filesystems.default'));
    [, , $conversation] = cmSetup();

    $response = $this->post(route('inbox.attachments.store', $conversation->id), [
        'file' => UploadedFile::fake()->image('anh-mau.png', 400, 300),
    ]);

    $response->assertCreated();
    expect($response->json('media_kind'))->toBe('image')
        ->and($response->json('filename'))->toBe('anh-mau.png');

    $attachment = Attachment::find($response->json('attachment_id'));
    expect($attachment->attachable_type)->toBe('conversation')
        ->and($attachment->attachable_id)->toBe($conversation->id);
    Storage::disk(config('filesystems.default'))->assertExists($attachment->path);
});

it('upload quá 20MB bị chặn 422', function () {
    Storage::fake(config('filesystems.default'));
    [, , $conversation] = cmSetup();

    $response = $this->postJson(route('inbox.attachments.store', $conversation->id), [
        'file' => UploadedFile::fake()->create('to-qua.pdf', 20481), // KB
    ]);

    $response->assertStatus(422);
});

it('upload vào conversation của workspace khác → 404 (RLS)', function () {
    Storage::fake(config('filesystems.default'));
    [, , $conversation] = cmSetup();

    // User workspace khác
    $otherWs = Workspace::factory()->create();
    $otherUser = User::factory()->create();
    actingInWorkspace($otherWs, $otherUser);
    seedMember($otherWs, $otherUser, 'admin');

    $response = $this->post(route('inbox.attachments.store', $conversation->id), [
        'file' => UploadedFile::fake()->image('x.png'),
    ]);

    $response->assertNotFound();
});

// ── Send media ───────────────────────────────────────────────────────────────

it('send với attachment_id: bridge nhận signed URL, message lưu display URL bền + alias msgId phụ', function () {
    Storage::fake(config('filesystems.default'));
    Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', '2026-01-15 10:00:00', 'Asia/Ho_Chi_Minh'));
    [$workspace, , $conversation] = cmSetup();
    cmConnectSlot($workspace, $conversation);

    $upload = $this->post(route('inbox.attachments.store', $conversation->id), [
        'file' => UploadedFile::fake()->image('gui-khach.png'),
    ])->json();

    Http::fake([
        '*personal-messages/send*' => Http::response([
            'ok' => true,
            'source_id' => 'za_text_1',
            'source_ids' => ['za_text_1', 'za_media_2'],
        ], 200),
    ]);

    $response = $this->postJson(route('inbox.send', $conversation->id), [
        'text' => 'Ảnh sản phẩm đây ạ',
        'attachment_id' => $upload['attachment_id'],
    ]);

    $response->assertCreated();

    $attachment = Attachment::find($upload['attachment_id']);
    $message = Message::where('conversation_id', $conversation->id)->where('direction', 'out')->sole();

    // media_url = display URL bền (KHÔNG phải signed URL hết hạn)
    expect($message->media_url)->toBe(route('inbox.attachments.show', $attachment->attachment_key))
        ->and($message->type)->toBe('image')
        ->and($message->media_meta['attachment_id'])->toBe($attachment->id)
        ->and($message->media_meta['media_filename'])->toBe('gui-khach.png')
        ->and($message->source_id)->toBe('za_text_1');

    // Bridge nhận file_url là signed URL của route raw
    Http::assertSent(function ($request) {
        $fileUrl = $request['file_url'] ?? '';

        return str_contains($fileUrl, '/raw')
            && str_contains($fileUrl, 'signature=')
            && ($request['media_kind'] ?? '') === 'image';
    });

    // msgId phụ (file+caption = 2 tin phía Zalo) → alias để echo dedup vào cùng row
    $alias = MessageSourceAlias::where('message_id', $message->id)->sole();
    expect($alias->source_id)->toBe('za_media_2')
        ->and($alias->kind)->toBe('multi_send');

    Carbon::setTestNow();
});

it('send attachment của conversation khác → 404, không gửi bridge', function () {
    Storage::fake(config('filesystems.default'));
    [$workspace, , $conversation] = cmSetup();

    $otherConv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'peer_uid' => 'peer_khac_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $upload = $this->post(route('inbox.attachments.store', $otherConv->id), [
        'file' => UploadedFile::fake()->image('cua-conv-khac.png'),
    ])->json();

    Http::fake();

    $this->postJson(route('inbox.send', $conversation->id), [
        'attachment_id' => $upload['attachment_id'],
    ])->assertNotFound();

    Http::assertNothingSent();
});

it('send rỗng (không text, không attachment) → 422', function () {
    [, , $conversation] = cmSetup();

    $this->postJson(route('inbox.send', $conversation->id), [])
        ->assertStatus(422);
});

// ── Serve routes ─────────────────────────────────────────────────────────────

it('route raw (bridge): signed URL hợp lệ stream 200, thiếu signature 403', function () {
    Storage::fake(config('filesystems.default'));
    [$workspace, , $conversation] = cmSetup();

    $upload = $this->post(route('inbox.attachments.store', $conversation->id), [
        'file' => UploadedFile::fake()->image('raw-test.png'),
    ])->json();
    $attachment = Attachment::find($upload['attachment_id']);

    $signed = URL::temporarySignedRoute('inbox.attachments.raw', now()->addMinutes(15), [
        'attachmentKey' => $attachment->attachment_key,
        'ws' => $workspace->id,
    ]);

    // Bridge không có session — dùng guest request
    auth()->logout();
    $this->get($signed)->assertOk();
    $this->get(route('inbox.attachments.raw', ['attachmentKey' => $attachment->attachment_key, 'ws' => $workspace->id]))
        ->assertForbidden();
});

it('route show: member xem được media trong chat (200)', function () {
    Storage::fake(config('filesystems.default'));
    [, , $conversation] = cmSetup();

    $upload = $this->post(route('inbox.attachments.store', $conversation->id), [
        'file' => UploadedFile::fake()->image('show-test.png'),
    ])->json();
    $attachment = Attachment::find($upload['attachment_id']);

    $this->get(route('inbox.attachments.show', $attachment->attachment_key))->assertOk();
});

// ── Prune transient ──────────────────────────────────────────────────────────

it('inbox:prune-transient xóa pending hết hạn + attachment chưa gửi quá 48h, GIỮ attachment đã gửi', function () {
    // Command chạy qua pgsql_privileged (system, cross-workspace) — session Postgres
    // RIÊNG, không thấy data chưa commit của transaction test. Fixture phải đi
    // privileged (committed) + cleanup cascade cuối test (pattern WebhookContractTest).
    Storage::fake(config('filesystems.default'));
    $disk = Storage::disk(config('filesystems.default'));
    $priv = fn (string $table) => DB::connection('pgsql_privileged')->table($table);

    $wsId = (string) Str::uuid();
    $priv('workspaces')->insert([
        'id' => $wsId,
        'name' => 'WS Prune',
        'slug' => 'ws-prune-'.uniqid(),
        'base_currency' => 'VND',
        'timezone' => 'Asia/Ho_Chi_Minh',
        'locale' => 'vi',
        'audit_retention' => '1y',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    try {
        $expiredId = (string) Str::uuid();
        $aliveId = (string) Str::uuid();
        foreach ([
            [$expiredId, 'msg_gone', now()->subHour()],
            [$aliveId, 'msg_alive', now()->addHours(24)],
        ] as [$id, $target, $expiresAt]) {
            $priv('pending_message_states')->insert([
                'id' => $id, 'workspace_id' => $wsId, 'event_type' => 'undo',
                'target_msg_id' => $target, 'payload' => '{}', 'expires_at' => $expiresAt,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $convId = (string) Str::uuid();
        $priv('conversations')->insert([
            'id' => $convId, 'workspace_id' => $wsId, 'channel' => 'zalo_personal',
            'peer_uid' => 'peer_prune', 'thread_type' => 0, 'conversation_number' => 1,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $makeAttachment = function (string $name, $createdAt) use ($priv, $wsId, $convId, $disk) {
            $id = (string) Str::uuid();
            $path = 'attachments/'.$wsId.'/'.$id.'.png';
            $disk->put($path, 'png-bytes');
            $priv('attachments')->insert([
                'id' => $id, 'workspace_id' => $wsId,
                'attachable_type' => 'conversation', 'attachable_id' => $convId,
                'original_name' => $name, 'path' => $path,
                'mime' => 'image/png', 'size' => 9,
                'attachment_key' => Str::random(40), 'lock_version' => 0,
                'created_at' => $createdAt, 'updated_at' => $createdAt,
            ]);

            return ['id' => $id, 'path' => $path];
        };

        $oldUnsent = $makeAttachment('cu-chua-gui.png', now()->subDays(3));
        $oldSent = $makeAttachment('cu-da-gui.png', now()->subDays(3));
        $freshUnsent = $makeAttachment('moi-chua-gui.png', now());

        // "Đã gửi" = có message tham chiếu media_meta.attachment_id
        $priv('messages')->insert([
            'id' => (string) Str::uuid(), 'workspace_id' => $wsId, 'conversation_id' => $convId,
            'direction' => 'out', 'type' => 'image',
            'media_meta' => json_encode(['attachment_id' => $oldSent['id'], 'media_kind' => 'image']),
            'platform_sent_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->artisan('inbox:prune-transient')->assertSuccessful();

        $pendingLeft = $priv('pending_message_states')->where('workspace_id', $wsId)->pluck('id')->all();
        expect($pendingLeft)->toBe([$aliveId]);

        $deletedAt = fn (array $a) => $priv('attachments')->where('id', $a['id'])->value('deleted_at');
        expect($deletedAt($oldUnsent))->not->toBeNull()   // chưa gửi + quá TTL → prune
            ->and($deletedAt($oldSent))->toBeNull()        // lịch sử chat giữ nguyên
            ->and($deletedAt($freshUnsent))->toBeNull();   // còn trong TTL

        $disk->assertMissing($oldUnsent['path']);
        $disk->assertExists($oldSent['path']);
    } finally {
        // Fixture committed — cascade FK dọn toàn bộ (conversations/messages/attachments/pending)
        $priv('workspaces')->where('id', $wsId)->delete();
    }
});
