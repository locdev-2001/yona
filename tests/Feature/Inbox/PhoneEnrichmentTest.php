<?php

use App\Events\MessageReceived;
use App\Models\ChannelAccount;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ProfileIdentity;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Models\ZaloConnection;
use App\Modules\Chat\Store\PhoneEnrichmentService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * P05 — enrich SĐT: business_card lift (consent-by-conduct A1) + manual verify
 * + nguồn mạnh/yếu + dedup CDP rule #1 (2 nguồn cùng SĐT → 1 hồ sơ).
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function peSetup(): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    return [$workspace, $user];
}

function peConversation(Workspace $workspace, string $senderUid, int $threadType = 0): Conversation
{
    return Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'channel_account_id' => (string) Str::uuid(),
        'sender_uid' => $senderUid,
        'thread_kind' => $threadType === 1 ? 'group' : 'direct',
        'thread_name' => 'Khách '.$senderUid,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
}

function peBusinessCardMessage(Conversation $conversation, string $phone, string $direction = 'in'): Message
{
    return Message::create([
        'workspace_id' => $conversation->workspace_id,
        'conversation_id' => $conversation->id,
        'direction' => $direction,
        'type' => 'business_card',
        'body' => null,
        'media_meta' => ['business_card' => ['name' => 'Danh thiếp', 'phone' => $phone, 'url' => 'https://zalo.me/x']],
        'source_id' => 'bc_'.uniqid(),
        'platform_sent_at' => now(),
    ]);
}

// ── Business card lift ───────────────────────────────────────────────────────

it('khách gửi danh thiếp → số vào bí danh + liên hệ tự link (0 lời gọi API)', function () {
    [$workspace] = peSetup();
    $conversation = peConversation($workspace, 'peer_bc_1');
    $message = peBusinessCardMessage($conversation, '0901 234 567');

    $applied = app(PhoneEnrichmentService::class)->liftFromBusinessCard($message);

    $conversation->refresh();
    expect($applied)->toBeTrue()
        ->and($conversation->senderPhone())->toBe('0901234567')
        ->and($conversation->contact_id)->not->toBeNull();

    $contact = Contact::find($conversation->contact_id);
    expect($contact->phone)->toBe('0901234567');
});

it('listener MessageReceived tự lift khi ingest danh thiếp (hook không sửa IntakeService)', function () {
    [$workspace] = peSetup();
    $conversation = peConversation($workspace, 'peer_bc_2');
    $message = peBusinessCardMessage($conversation, '0912345678');

    event(new MessageReceived($message));

    expect($conversation->fresh()->senderPhone())->toBe('0912345678');
});

it('danh thiếp do MÌNH gửi (direction out) KHÔNG lift — consent chỉ khi khách chủ động gửi', function () {
    [$workspace] = peSetup();
    $conversation = peConversation($workspace, 'peer_bc_3');
    $message = peBusinessCardMessage($conversation, '0987654321', 'out');

    $applied = app(PhoneEnrichmentService::class)->liftFromBusinessCard($message);

    expect($applied)->toBeFalse()
        ->and($conversation->fresh()->senderPhone())->toBeNull();
});

it('danh thiếp trong NHÓM không lift (SĐT không thuộc về group thread)', function () {
    [$workspace] = peSetup();
    $group = peConversation($workspace, 'group_bc_1', 1);
    $message = peBusinessCardMessage($group, '0911222333');

    expect(app(PhoneEnrichmentService::class)->liftFromBusinessCard($message))->toBeFalse()
        ->and($group->fresh()->senderPhone())->toBeNull();
});

// ── Nguồn mạnh/yếu ───────────────────────────────────────────────────────────

it('KHÔNG ghi đè nguồn mạnh bằng nguồn yếu; cùng hạng = take-latest; mạnh hơn ghi đè được', function () {
    [$workspace] = peSetup();
    $conversation = peConversation($workspace, 'peer_src_1');
    $service = app(PhoneEnrichmentService::class);

    // manual_verified (mạnh nhất)
    expect($service->applyPhone($conversation, '0901111111', 'manual_verified', now()))->toBeTrue();
    expect(ProfileIdentity::where('profile_id', $conversation->fresh()->profile_id)->where('key', 'phone')->value('source'))->toBe('manual_verified');

    // business_card yếu hơn → KHÔNG ghi đè
    expect($service->applyPhone($conversation->fresh(), '0902222222', 'business_card'))->toBeFalse();
    expect($conversation->fresh()->senderPhone())->toBe('0901111111');

    // manual_verified cùng hạng → take-latest (sửa typo)
    expect($service->applyPhone($conversation->fresh(), '0903333333', 'manual_verified', now()))->toBeTrue();
    expect($conversation->fresh()->senderPhone())->toBe('0903333333');
});

// ── Rule #1 CDP: 2 nguồn cùng SĐT → 1 hồ sơ ─────────────────────────────────

it('e2e dedup: 2 conversation khác nguồn cùng SĐT → CÙNG 1 contact (1 hồ sơ)', function () {
    [$workspace] = peSetup();
    $service = app(PhoneEnrichmentService::class);

    $convA = peConversation($workspace, 'peer_dedup_a');
    $convB = peConversation($workspace, 'peer_dedup_b');

    $service->liftFromBusinessCard(peBusinessCardMessage($convA, '0905 555 666'));
    $service->applyPhone($convB->fresh(), '0905555666', 'manual_verified', now());

    $contactA = $convA->fresh()->contact_id;
    $contactB = $convB->fresh()->contact_id;

    expect($contactA)->not->toBeNull()
        ->and($contactB)->toBe($contactA)
        ->and(Contact::where('phone', '0905555666')->count())->toBe(1);
});

it('conversation đã có contact KHÁC khi SĐT resolve về contact khác → flag needs_merge_review, KHÔNG auto-merge', function () {
    [$workspace] = peSetup();
    $service = app(PhoneEnrichmentService::class);

    // Contact cũ gắn sẵn vào conversation (không có phone)
    $oldContact = new Contact;
    $oldContact->first_name = 'Hồ sơ cũ';
    $oldContact->save();

    $conversation = peConversation($workspace, 'peer_merge_1');
    $conversation->update(['contact_id' => $oldContact->id]);

    // SĐT mới resolve ra contact KHÁC (đã tồn tại với phone này)
    $phoneContact = new Contact;
    $phoneContact->first_name = 'Hồ sơ theo SĐT';
    $phoneContact->phone = '0907777888';
    $phoneContact->save();

    $service->applyPhone($conversation->fresh(), '0907777888', 'business_card');

    $conversation->refresh();
    // KHÔNG repoint tự động
    expect($conversation->contact_id)->toBe($oldContact->id)
        ->and($oldContact->fresh()->needs_merge_review)->toBeTrue();
});

// ── Manual verify endpoint ───────────────────────────────────────────────────

it('nhập tay: driver verify FAIL (uid không khớp / không resolve) → 422, KHÔNG lưu', function () {
    [$workspace] = peSetup();
    $conversation = peConversation($workspace, 'peer_manual_1');

    // Không có slot connected → verify unavailable → 422, không lưu
    $response = $this->putJson(route('inbox.phone.update', $conversation->id), ['phone' => '0901234567']);

    $response->assertStatus(422);
    expect($conversation->fresh()->senderPhone())->toBeNull();
});

it('nhập tay: phone sai format → 422 validation', function () {
    [$workspace] = peSetup();
    $conversation = peConversation($workspace, 'peer_manual_2');

    $this->putJson(route('inbox.phone.update', $conversation->id), ['phone' => 'abc'])
        ->assertStatus(422);
});

// ── Review LOW-3: 2 nhánh reject findUser tường minh ─────────────────────────

function peConversationWithSlot(Workspace $workspace, string $senderUid): Conversation
{
    $account = ChannelAccount::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'account_uid' => 'uid_pe_'.uniqid(),
        'status' => 'connected',
    ]);
    ZaloConnection::create([
        'workspace_id' => $workspace->id,
        'connection_id' => ZaloConnection::nextConnectionId(),
        'channel_account_id' => $account->id,
        'state' => 'connected',
        'lock_version' => 0,
    ]);
    $conversation = peConversation($workspace, $senderUid);
    $conversation->update(['channel_account_id' => $account->id]);

    return $conversation->fresh();
}

it('verify: findUser KHÔNG resolve (bridge 500 / số không dùng Zalo) → 422, không lưu', function () {
    [$workspace] = peSetup();
    $conversation = peConversationWithSlot($workspace, 'peer_v500');

    Http::fake([
        '*zca/findUser*' => Http::response(['ok' => false, 'message' => 'zca error 216'], 500),
    ]);

    $this->putJson(route('inbox.phone.update', $conversation->id), ['phone' => '0901234567'])
        ->assertStatus(422);
    expect($conversation->fresh()->senderPhone())->toBeNull();
});

it('verify: findUser resolve nhưng uid KHÔNG khớp sender_uid → 422, không lưu', function () {
    [$workspace] = peSetup();
    $conversation = peConversationWithSlot($workspace, 'peer_v_mismatch');

    Http::fake([
        '*zca/findUser*' => Http::response(['ok' => true, 'result' => ['uid' => 'NGUOI_KHAC_999']], 200),
    ]);

    $response = $this->putJson(route('inbox.phone.update', $conversation->id), ['phone' => '0901234567']);

    $response->assertStatus(422);
    expect($response->json('error_code'))->toBe('phone_mismatch')
        ->and($conversation->fresh()->senderPhone())->toBeNull();
});

it('verify: throttle 5/phút → lần 6 trả 429 (review MED-1)', function () {
    [$workspace] = peSetup();
    $conversation = peConversationWithSlot($workspace, 'peer_v_throttle');

    Http::fake([
        '*zca/findUser*' => Http::response(['ok' => true, 'result' => ['uid' => 'X']], 200),
    ]);

    for ($i = 0; $i < 5; $i++) {
        $this->putJson(route('inbox.phone.update', $conversation->id), ['phone' => '090123456'.$i])
            ->assertStatus(422); // mismatch — nhưng ĐÃ tiêu 1 lượt
    }
    $this->putJson(route('inbox.phone.update', $conversation->id), ['phone' => '0901234599'])
        ->assertStatus(429);
});
