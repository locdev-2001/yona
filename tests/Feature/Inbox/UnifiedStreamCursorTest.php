<?php

use App\Models\Conversation;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * P05 — ConversationStreamController: messages + conversation_events hợp
 * nhất, sort (stream_at, stream_rank, id), keyset cursor phân trang lùi.
 *
 * @group inbox-stream
 */
function makeStreamUser(Workspace $ws): User
{
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    app(PermissionRegistrar::class)->setPermissionsTeamId($ws->id);
    $perm = Permission::firstOrCreate(['name' => 'tenant.crm.view', 'guard_name' => 'web']);
    $user->givePermissionTo($perm);

    return $user;
}

function insertStreamMessage(Conversation $conversation, string $platformSentAt, string $body): string
{
    $id = (string) Str::uuid();
    DB::table('messages')->insert([
        'id' => $id,
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'direction' => 'in',
        'type' => 'text',
        'body' => $body,
        'source_id' => 'src_'.$id,
        'platform_sent_at' => $platformSentAt,
        'created_at' => $platformSentAt,
        'updated_at' => $platformSentAt,
    ]);

    return $id;
}

function insertStreamEvent(Conversation $conversation, string $gapStartedAt): string
{
    $id = (string) Str::uuid();
    DB::table('conversation_events')->insert([
        'id' => $id,
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'kind' => 'session_gap',
        'gap_started_at' => $gapStartedAt,
        'gap_ended_at' => $gapStartedAt,
        'stream_at' => $gapStartedAt,
        'stream_rank' => 5,
        'created_at' => $gapStartedAt,
    ]);

    return $id;
}

it('returns messages and the gap marker merged in chronological order', function () {
    $ws = Workspace::factory()->create();
    $user = makeStreamUser($ws);

    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'sender_uid' => 'peer_stream_1',
        'thread_type' => 0,
        'conversation_number' => 1,
    ]);

    $t0 = now()->subMinutes(30);
    $m1 = insertStreamMessage($conversation, $t0->toDateTimeString(), 'trước gap');
    $gapAt = $t0->clone()->addMinutes(10);
    $e1 = insertStreamEvent($conversation, $gapAt->toDateTimeString());
    $m2 = insertStreamMessage($conversation, $gapAt->clone()->addMinute()->toDateTimeString(), 'sau gap');

    $response = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->getJson(route('inbox.stream', $conversation->id))
        ->assertStatus(200);

    $items = $response->json('items');
    expect($items)->toHaveCount(3);
    expect(array_column($items, 'id'))->toBe([$m1, $e1, $m2]);
    expect($items[1]['item_type'])->toBe('event');
    expect($items[0]['item_type'])->toBe('message');
    expect($items[2]['item_type'])->toBe('message');
})->group('inbox-stream');

it('paginates backward via cursor without gaps or duplicates across the page boundary', function () {
    $ws = Workspace::factory()->create();
    $user = makeStreamUser($ws);

    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'sender_uid' => 'peer_stream_2',
        'thread_type' => 0,
        'conversation_number' => 2,
    ]);

    $base = now()->subHour();
    $ids = [];
    foreach (range(0, 4) as $i) {
        $ids[] = insertStreamMessage($conversation, $base->clone()->addSeconds($i)->toDateTimeString(), "tin {$i}");
    }

    // Trang 1: 2 item mới nhất
    $page1 = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->getJson(route('inbox.stream', $conversation->id).'?limit=2')
        ->assertStatus(200)
        ->json();

    expect(array_column($page1['items'], 'id'))->toBe([$ids[3], $ids[4]]);
    expect($page1['next_cursor'])->not->toBeNull();

    // Trang 2: 2 item cũ hơn tiếp theo, dùng cursor từ trang 1
    $page2 = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->getJson(route('inbox.stream', $conversation->id).'?limit=2&cursor='.urlencode($page1['next_cursor']))
        ->assertStatus(200)
        ->json();

    expect(array_column($page2['items'], 'id'))->toBe([$ids[1], $ids[2]]);
    expect($page2['next_cursor'])->not->toBeNull();

    // Trang 3: item cũ nhất còn lại, hết cursor
    $page3 = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->getJson(route('inbox.stream', $conversation->id).'?limit=2&cursor='.urlencode($page2['next_cursor']))
        ->assertStatus(200)
        ->json();

    expect(array_column($page3['items'], 'id'))->toBe([$ids[0]]);
    expect($page3['next_cursor'])->toBeNull();
})->group('inbox-stream');

// P09 spike #5 — tin đến TRỄ nhưng platform_sent_at CŨ hơn dữ liệu đã có (backfill/replay
// out-of-order) vẫn phải rơi đúng vị trí thời gian trong stream — sort theo stream_at (cột
// timestamp thật), KHÔNG theo thứ tự insert. Không có mốc trùng giây thật (timestamp(0),
// xem messages/conversation_events) nên rank tie-break không tự nhiên xảy ra; bài test này
// xác nhận marker + tin không "nhảy" chỗ khi có 1 tin trễ chen giữa.
it('an out-of-order (late-arriving, older platform_sent_at) message is re-sorted into its chronological slot, not appended at the end', function () {
    $ws = Workspace::factory()->create();
    $user = makeStreamUser($ws);

    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'sender_uid' => 'peer_stream_ooo',
        'thread_type' => 0,
        'conversation_number' => 4,
    ]);

    $t0 = now()->subMinutes(30);
    $m1 = insertStreamMessage($conversation, $t0->toDateTimeString(), 'trước gap');
    $gapAt = $t0->clone()->addMinutes(10);
    $e1 = insertStreamEvent($conversation, $gapAt->toDateTimeString());
    $m2 = insertStreamMessage($conversation, $gapAt->clone()->addMinute()->toDateTimeString(), 'sau gap');

    // Tin trễ: INSERT CUỐI CÙNG (sau m1/e1/m2) nhưng platform_sent_at nằm GIỮA m1 và marker.
    $mLate = insertStreamMessage($conversation, $t0->clone()->addMinutes(5)->toDateTimeString(), 'tin trễ, giữa m1 và gap');

    $response = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->getJson(route('inbox.stream', $conversation->id))
        ->assertStatus(200);

    $items = $response->json('items');
    expect(array_column($items, 'id'))->toBe([$m1, $mLate, $e1, $m2]);
})->group('inbox-stream');

it('reports the current stream_version in the response', function () {
    $ws = Workspace::factory()->create();
    $user = makeStreamUser($ws);

    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'sender_uid' => 'peer_stream_3',
        'thread_type' => 0,
        'conversation_number' => 3,
    ]);
    Conversation::where('id', $conversation->id)->update(['stream_version' => 7]);

    $response = $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->getJson(route('inbox.stream', $conversation->id))
        ->assertStatus(200);

    expect($response->json('stream_version'))->toBe(7);
})->group('inbox-stream');

// P03 — stream item mang message-state (recalled/receipts/reactions) cho FE render
it('stream item includes recalled_at, delivered_at, seen_at and reactions', function () {
    $ws = Workspace::factory()->create();
    $user = makeStreamUser($ws);

    $conversation = Conversation::create([
        'channel' => 'zalo_personal',
        'sender_uid' => 'peer_state_stream',
        'thread_type' => 0,
        'conversation_number' => 77,
    ]);

    $t = now()->subMinutes(5)->toDateTimeString();
    $messageId = insertStreamMessage($conversation, $t, 'tin có state');
    DB::table('messages')->where('id', $messageId)->update([
        'recalled_at' => now()->subMinutes(2),
        'delivered_at' => now()->subMinutes(4),
        'seen_at' => now()->subMinutes(3),
    ]);
    DB::table('message_reactions')->insert([
        'id' => (string) Str::uuid(),
        'workspace_id' => $ws->id,
        'message_id' => $messageId,
        'reactor_uid' => 'peer_x',
        'icon' => '/-heart',
        'reacted_at' => now()->subMinutes(1),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $item = collect($this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->getJson(route('inbox.stream', $conversation->id))
        ->assertOk()
        ->json('items'))->firstWhere('id', $messageId);

    expect($item['recalled_at'])->not->toBeNull()
        ->and($item['delivered_at'])->not->toBeNull()
        ->and($item['seen_at'])->not->toBeNull()
        ->and($item['reactions'])->toHaveCount(1)
        ->and($item['reactions'][0]['icon'])->toBe('/-heart')
        ->and($item['reactions'][0]['reactor_uid'])->toBe('peer_x');
});
