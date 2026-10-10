<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Zalo;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;

// Khung soạn hội thoại mới chỉ hiện hộp thư mở được hội thoại tới liên hệ, theo năng lực kênh.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id, 'email' => 'khach@example.com']);
});

function contactableInboxesOf($test, ?User $user = null): array
{
    return $test->actingAs($user ?? $test->agent)
        ->getJson("/api/v1/accounts/{$test->account->id}/contacts/{$test->contact->id}/contactable_inboxes")
        ->assertOk()
        ->json('payload');
}

function memberInbox($test, Inbox $inbox): Inbox
{
    $inbox->addMembers([$test->agent->id]);

    return $inbox;
}

it('liệt kê hộp Email theo email liên hệ, đúng hình dạng hợp đồng', function () {
    $email = memberInbox($this, Inbox::factory()->email()->create(['account_id' => $this->account->id]));

    $payload = contactableInboxesOf($this);

    expect($payload)->toHaveCount(1)
        ->and($payload[0])->toMatchArray(['source_id' => 'khach@example.com', 'available' => true, 'reason' => null])
        ->and(array_keys($payload[0]['inbox']))->toBe(['id', 'name', 'channel_type', 'capabilities', 'platform', 'avatar_url'])
        ->and($payload[0]['inbox']['id'])->toBe($email->id)
        ->and($payload[0]['inbox']['channel_type'])->toBe('Channel::Email')
        ->and($payload[0]['inbox']['capabilities'])->toContain('conversation_outbound_start')
        ->and($payload[0]['inbox']['platform']['key'])->toBe('email');
});

it('bỏ hộp Email khi liên hệ chưa có email', function () {
    memberInbox($this, Inbox::factory()->email()->create(['account_id' => $this->account->id]));
    $this->contact->update(['email' => null]);

    expect(contactableInboxesOf($this))->toBe([]);
});

it('Zalo chỉ hiện khi khách đã có địa chỉ ở hộp đó', function () {
    $zalo = memberInbox($this, Inbox::factory()->zalo()->create(['account_id' => $this->account->id]));

    expect(contactableInboxesOf($this))->toBe([]);

    ContactInbox::factory()->create(['contact_id' => $this->contact->id, 'inbox_id' => $zalo->id, 'source_id' => 'zalo-uid-1']);

    $payload = contactableInboxesOf($this);

    expect($payload)->toHaveCount(1)
        ->and($payload[0]['source_id'])->toBe('zalo-uid-1')
        ->and($payload[0]['inbox']['capabilities'])->toContain('conversation_outbound_resume')
        ->and($payload[0]['available'])->toBeTrue();
});

it('hộp mất phiên vẫn hiện nhưng không chọn được, kèm lý do', function () {
    $zalo = memberInbox($this, Inbox::factory()->zalo()->create([
        'account_id' => $this->account->id,
        'channel_id' => Zalo::factory()->create(['account_id' => $this->account->id, 'state' => Zalo::STATE_SESSION_LOST])->id,
    ]));
    ContactInbox::factory()->create(['contact_id' => $this->contact->id, 'inbox_id' => $zalo->id, 'source_id' => 'zalo-uid-1']);

    expect(contactableInboxesOf($this)[0])->toMatchArray(['available' => false, 'reason' => 'reauthorization_required']);
});

it('không bao giờ hiện hộp API hay widget', function () {
    $api = memberInbox($this, Inbox::factory()->create(['account_id' => $this->account->id]));
    $widget = memberInbox($this, Inbox::factory()->webWidget()->create(['account_id' => $this->account->id]));

    foreach ([$api, $widget] as $inbox) {
        ContactInbox::factory()->create(['contact_id' => $this->contact->id, 'inbox_id' => $inbox->id]);
    }

    expect($api->channel_type)->toBe('Channel::Api')
        ->and(contactableInboxesOf($this))->toBe([]);
});

it('agent chỉ thấy hộp mình là thành viên, quản trị viên thấy mọi hộp', function () {
    $memberOf = memberInbox($this, Inbox::factory()->email()->create(['account_id' => $this->account->id]));
    $notMember = Inbox::factory()->email()->create(['account_id' => $this->account->id]);
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $admin->id]);

    expect(array_column(array_column(contactableInboxesOf($this), 'inbox'), 'id'))->toBe([$memberOf->id])
        ->and(array_column(array_column(contactableInboxesOf($this, $admin), 'inbox'), 'id'))
        ->toEqualCanonicalizing([$memberOf->id, $notMember->id]);
});

it('hộp có hội thoại gần nhất với liên hệ đứng trước', function () {
    $quiet = memberInbox($this, Inbox::factory()->email()->create(['account_id' => $this->account->id]));
    $recent = memberInbox($this, Inbox::factory()->email()->create(['account_id' => $this->account->id]));
    Conversation::factory()->create([
        'account_id' => $this->account->id, 'inbox_id' => $quiet->id, 'contact_id' => $this->contact->id,
        'last_activity_at' => now()->subWeek(),
    ]);
    Conversation::factory()->create([
        'account_id' => $this->account->id, 'inbox_id' => $recent->id, 'contact_id' => $this->contact->id,
        'last_activity_at' => now()->subHour(),
    ]);

    expect(array_column(array_column(contactableInboxesOf($this), 'inbox'), 'id'))->toBe([$recent->id, $quiet->id]);
});

it('liên hệ của account khác thì 404', function () {
    $other = Contact::factory()->create();

    $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$other->id}/contactable_inboxes")
        ->assertNotFound();
});
