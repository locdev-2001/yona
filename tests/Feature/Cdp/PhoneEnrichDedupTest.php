<?php

use App\Models\Activity;
use App\Models\Contact;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Models\Workspace;
use App\Policies\ContactPolicy;
use App\Services\ContactService;
use App\Services\LeadConversionService;
use App\Services\LeadService;

// ── Phase-07: cdp-dedup tests ─────────────────────────────────────────────────
// Covers: normalizePhone, firstOrCreateByPhone (idempotent), mergeIdentities (flag-not-auto),
//         Contact.client_id nullable.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cdpWorkspace(): array
{
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    return compact('ws', 'user');
}

// ─── normalizePhone ───────────────────────────────────────────────────────────

it('normalizePhone: chuẩn hóa +84 về 0xxx', function () {
    $repo = app(ContactService::class);

    expect($repo->normalizePhone('+84 90 123 4567'))->toBe('0901234567')
        ->and($repo->normalizePhone('84901234567'))->toBe('0901234567')
        ->and($repo->normalizePhone('0901234567'))->toBe('0901234567')
        ->and($repo->normalizePhone('(090) 123-4567'))->toBe('0901234567');
});

it('normalizePhone: trả null cho SĐT không hợp lệ', function () {
    $repo = app(ContactService::class);

    expect($repo->normalizePhone(null))->toBeNull()
        ->and($repo->normalizePhone(''))->toBeNull()
        ->and($repo->normalizePhone('abc'))->toBeNull()
        ->and($repo->normalizePhone('12345'))->toBeNull(); // quá ngắn
});

// ─── firstOrCreateByPhone idempotent ─────────────────────────────────────────

it('firstOrCreateByPhone: tạo mới contact draft khi chưa có', function () {
    cdpWorkspace();
    $repo = app(ContactService::class);

    $contact = $repo->firstOrCreateByPhone('0901234567', 'Nguyễn Văn An');

    // Name 'Nguyễn Văn An' → first_name='Nguyễn', last_name='Văn An' (split by space limit 2)
    expect($contact)->toBeInstanceOf(Contact::class)
        ->and($contact->phone)->toBe('0901234567')
        ->and($contact->client_id)->toBeNull() // Liên hệ nháp
        ->and($contact->first_name)->toBe('Nguyễn')
        ->and($contact->last_name)->toBe('Văn An');
});

it('firstOrCreateByPhone: idempotent — 2 lần cùng phone trả cùng 1 contact', function () {
    cdpWorkspace();
    $repo = app(ContactService::class);

    $first = $repo->firstOrCreateByPhone('0901234567', 'Nguyễn Văn An');
    $second = $repo->firstOrCreateByPhone('0901234567', 'Tên Khác');

    expect($first->id)->toBe($second->id);
    expect(Contact::where('phone', '0901234567')->count())->toBe(1);
});

it('firstOrCreateByPhone: tự normalize phone trước khi tra', function () {
    cdpWorkspace();
    $repo = app(ContactService::class);

    $contact = $repo->firstOrCreateByPhone('+84 90 123 4567', 'Khách A');
    $same = $repo->firstOrCreateByPhone('0901234567', 'Khách A');

    expect($contact->id)->toBe($same->id);
});

it('firstOrCreateByPhone: throw InvalidArgumentException khi phone không hợp lệ', function () {
    cdpWorkspace();
    $repo = app(ContactService::class);

    expect(fn () => $repo->firstOrCreateByPhone('abc123'))->toThrow(InvalidArgumentException::class);
});

// ─── Contact.client_id nullable ──────────────────────────────────────────────

it('tạo Contact không có client_id thành công (Liên hệ nháp)', function () {
    cdpWorkspace();

    $contact = new Contact;
    $contact->first_name = 'Khách';
    $contact->phone = '0912345678';
    $contact->save();

    expect($contact->id)->not->toBeNull()
        ->and($contact->client_id)->toBeNull();
});

it('Contact.client_id nullable không làm vỡ ContactPolicy.view khi client = null', function () {
    ['ws' => $ws, 'user' => $user] = cdpWorkspace();

    $contact = new Contact;
    $contact->first_name = 'Nháp';
    $contact->phone = '0933333333';
    $contact->save();

    $policy = new ContactPolicy;
    // Draft contact: client = null → view returns false (policy delegate to client)
    expect($policy->view($user, $contact))->toBeFalse();
});

// ─── mergeIdentities: flag-not-auto ──────────────────────────────────────────

it('mergeIdentities: flag needs_merge_review trên cả 2 contact, KHÔNG auto-merge', function () {
    ['ws' => $ws] = cdpWorkspace();

    $primary = Contact::factory()->create(['workspace_id' => $ws->id, 'phone' => '0901111111']);
    $duplicate = Contact::factory()->create(['workspace_id' => $ws->id, 'phone' => '0901111112']);

    $resolver = app(ContactService::class);
    $resolver->mergeIdentities($ws->id, $primary->id, $duplicate->id);

    $primary->refresh();
    $duplicate->refresh();

    expect($primary->needs_merge_review)->toBeTrue()
        ->and($primary->merge_review_with)->toBe($duplicate->id)
        ->and($duplicate->needs_merge_review)->toBeTrue()
        ->and($duplicate->merge_review_with)->toBe($primary->id);

    // Cả 2 contact vẫn tồn tại (KHÔNG auto-merge)
    expect(Contact::where('id', $primary->id)->exists())->toBeTrue()
        ->and(Contact::where('id', $duplicate->id)->exists())->toBeTrue();
});

it('mergeIdentities: idempotent — gọi 2 lần không duplicate flag', function () {
    ['ws' => $ws] = cdpWorkspace();

    $primary = Contact::factory()->create(['workspace_id' => $ws->id]);
    $duplicate = Contact::factory()->create(['workspace_id' => $ws->id]);

    $resolver = app(ContactService::class);
    $resolver->mergeIdentities($ws->id, $primary->id, $duplicate->id);
    $resolver->mergeIdentities($ws->id, $primary->id, $duplicate->id);

    // Flag vẫn đúng sau 2 lần gọi (idempotent skip lần 2)
    $primary->refresh();
    expect($primary->needs_merge_review)->toBeTrue()
        ->and($primary->merge_review_with)->toBe($duplicate->id);

    // Chỉ 1 activity log (Contact dùng HasActivities nếu có, nếu không bỏ qua check này)
    // ponytail: Contact không trait HasActivities → kiểm qua Activity model trực tiếp
    $activityCount = Activity::where('subject_type', 'contact')
        ->where('subject_id', $primary->id)
        ->where('action', 'contact.merge_review_flagged')
        ->count();
    expect($activityCount)->toBe(1);
});

// ─── RLS: contacts còn enforce workspace isolation ────────────────────────────

it('contacts RLS: workspace A không thấy contact workspace B', function () {
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsB, $userB, 'admin');

    // Tạo contact trong workspace B
    actingInWorkspace($wsB, $userB);
    $contactB = new Contact;
    $contactB->first_name = 'B Contact';
    $contactB->phone = '0944444444';
    $contactB->save();

    // Workspace A không thấy contact của B
    actingInWorkspace($wsA, $userA);
    $found = Contact::where('phone', '0944444444')->first();
    expect($found)->toBeNull();
});

// ─── LeadConversion: Contact.client_id nullable không vỡ convert lead ─────────

it('convert lead → vẫn tạo Contact với client_id (nullable không vỡ)', function () {
    ['ws' => $ws, 'user' => $user] = cdpWorkspace();

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'won',
    ]);
    $openStage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'open',
    ]);

    $lead = app(LeadService::class)->create([
        'name' => 'Trần Thị Bình',
        'company' => 'ABC Corp',
        'email' => 'binh@abc.com',
        'phone' => '0912111222',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $openStage->id,
    ]);

    $client = app(LeadConversionService::class)->convert($lead);

    // Contact phải có client_id (NOT null khi tạo qua conversion)
    $contact = Contact::where('client_id', $client->id)->where('is_primary', true)->first();
    expect($contact)->not->toBeNull()
        ->and($contact->client_id)->toBe($client->id)
        ->and($contact->phone)->toBe('0912111222');
});
