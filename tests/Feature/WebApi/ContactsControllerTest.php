<?php

use App\Jobs\ActionCableBroadcastJob;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use App\Models\User;
use App\Support\OnlineStatusTracker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Port từ spec/controllers/api/v1/accounts/contacts_controller_spec.rb.
// Bỏ ở B2: import/export/filter (tính năng chưa port), lọc labels (nhóm C),
// case "last seen at" (conversations B3).

function contactUserOf(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

describe('GET /api/v1/accounts/{id}/contacts', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/contacts")->assertUnauthorized();
    });

    it('returns contacts along with contact inboxes', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->withEmail()->create(['account_id' => $account->id]);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('email'))->toContain($contact->email)
            ->and(collect($response->json('payload'))->flatMap(fn ($c) => collect($c['contact_inboxes'])->pluck('source_id')))
            ->toContain($contactInbox->source_id);
    });

    it('returns all contacts without contact inboxes when param is false', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->withEmail()->create(['account_id' => $account->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts?include_contact_inboxes=false")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('email'))->toContain($contact->email)
            ->and($response->json('payload.0'))->not->toHaveKey('contact_inboxes');
    });

    it('returns limited information on inboxes', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->withEmail()->create(['account_id' => $account->id]);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts?include_contact_inboxes=true")
            ->assertOk();

        $inboxPayload = $response->json('payload.0.contact_inboxes.0.inbox');

        expect($inboxPayload)->toHaveKeys(['id', 'channel_id', 'channel_type', 'name', 'avatar_url', 'provider'])
            ->not->toHaveKeys(['hmac_token', 'secret', 'webhook_url']);
    });

    it('lists unidentified contacts too and counts both kinds', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $identified = Contact::factory()->withEmail()->create(['account_id' => $account->id]);
        $channelOnly = Contact::factory()->create(['account_id' => $account->id, 'email' => null, 'phone_number' => null, 'identifier' => null]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('identified', 'id')->all())
            ->toEqual([$identified->id => true, $channelOnly->id => false])
            ->and($response->json('meta'))->toMatchArray(['count' => 2, 'identified_count' => 1, 'unidentified_count' => 1]);
    });

    it('filters by identification while keeping both counts', function (string $param, bool $expectIdentified) {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $identified = Contact::factory()->withEmail()->create(['account_id' => $account->id]);
        $channelOnly = Contact::factory()->create(['account_id' => $account->id, 'email' => null, 'phone_number' => null, 'identifier' => null]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts?identified={$param}")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('id')->all())
            ->toBe([$expectIdentified ? $identified->id : $channelOnly->id])
            ->and($response->json('meta'))->toMatchArray(['count' => 1, 'identified_count' => 1, 'unidentified_count' => 1]);
    })->with([
        'đã định danh' => ['true', true],
        'chưa định danh' => ['false', false],
    ]);

    it('sorts by company name desc with nulls last', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $companyOne = Contact::factory()->withEmail()->create([
            'account_id' => $account->id, 'additional_attributes' => ['company_name' => 'Company 1'],
        ]);
        $testCompany = Contact::factory()->withEmail()->create([
            'account_id' => $account->id, 'additional_attributes' => ['company_name' => 'Test Company 1'],
        ]);
        $noCompany = Contact::factory()->withEmail()->create(['account_id' => $account->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts?include_contact_inboxes=false&sort=-company_name")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('id')->all())
            ->toBe([$testCompany->id, $companyOne->id, $noCompany->id]);
    });

    it('sorts by country name asc with nulls last', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $noCountry = Contact::factory()->withEmail()->create(['account_id' => $account->id]);
        $albania = Contact::factory()->withEmail()->create([
            'account_id' => $account->id, 'additional_attributes' => ['country_code' => 'AL', 'country' => 'Albania'],
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts?include_contact_inboxes=false&sort=country")
            ->assertOk();

        expect($response->json('payload.0.id'))->toBe($albania->id)
            ->and(collect($response->json('payload'))->pluck('id')->last())->toBe($noCountry->id);
    });

    it('paginates with 15 results per page', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        Contact::factory()->withEmail()->count(16)->create(['account_id' => $account->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts?include_contact_inboxes=false")
            ->assertOk();

        expect($response->json('payload'))->toHaveCount(15)
            ->and($response->json('meta.count'))->toBe(16)
            ->and($response->json('meta.current_page'))->toBe(1);
    });
});

describe('GET /api/v1/accounts/{id}/contacts/search', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/contacts/search")->assertUnauthorized();
    });

    it('returns error when q is blank', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/search")
            ->assertStatus(422)
            ->assertJson(['error' => 'Specify search string with parameter q']);
    });

    it('returns matching contacts only', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $other = Contact::factory()->withEmail()->create(['account_id' => $account->id]);
        $match = Contact::factory()->create([
            'account_id' => $account->id, 'name' => 'testcontact', 'email' => 'test@test.com',
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/search?q={$match->email}")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('email'))
            ->toContain($match->email)
            ->not->toContain($other->email);
    });

    it('matches the contact ignoring the case in email', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $match = Contact::factory()->create([
            'account_id' => $account->id, 'name' => 'testcontact', 'email' => 'test@test.com',
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/search?q=Test%40Test.com")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('email'))->toContain($match->email);
    });

    it('matches the contact ignoring the case in name', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $match = Contact::factory()->create([
            'account_id' => $account->id, 'name' => 'testcontact', 'email' => 'test@test.com',
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/search?q=TestContact")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('email'))->toContain($match->email);
    });

    it('matches the identifier respecting character casing', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $normal = Contact::factory()->create([
            'account_id' => $account->id, 'name' => 'testcontact', 'identifier' => 'testidentifier',
        ]);
        $special = Contact::factory()->create([
            'account_id' => $account->id, 'name' => 'othercontact', 'identifier' => 'TestIdentifier',
        ]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/search?q=TestIdentifier")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('identifier'))
            ->toContain($special->identifier)
            ->not->toContain($normal->identifier);
    });

    it('returns has_more false when results fit in one page', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        Contact::factory()->create(['account_id' => $account->id, 'email' => 'test@test.com']);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/search?q=test%40test.com")
            ->assertOk();

        expect($response->json('meta.has_more'))->toBeFalse()
            ->and($response->json('meta.count'))->toBe(1);
    });

    it('returns has_more true when there are more results', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        Contact::factory()->count(16)->create(['account_id' => $account->id, 'name' => 'searchable_contact']);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/search?q=searchable_contact")
            ->assertOk();

        expect($response->json('meta.has_more'))->toBeTrue()
            ->and($response->json('meta.count'))->toBe(15)
            ->and($response->json('payload'))->toHaveCount(15);
    });

    it('returns has_more false on the last page', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        Contact::factory()->count(16)->create(['account_id' => $account->id, 'name' => 'searchable_contact']);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/search?q=searchable_contact&page=2")
            ->assertOk();

        expect($response->json('meta.has_more'))->toBeFalse()
            ->and($response->json('meta.count'))->toBe(1)
            ->and($response->json('payload'))->toHaveCount(1);
    });
});

describe('GET /api/v1/accounts/{id}/contacts/active', function () {
    it('returns no contacts when nobody is online', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        Contact::factory()->withEmail()->create(['account_id' => $account->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/active")
            ->assertOk();

        expect($response->json('payload'))->toBeEmpty();
    });

    it('returns all contacts who are online', function () {
        $account = Account::factory()->create();
        OnlineStatusTracker::clearAccount($account->id);
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $onlineContact = Contact::factory()->create(['account_id' => $account->id, 'name' => 'Online Contact']);
        $offlineContact = Contact::factory()->create(['account_id' => $account->id, 'name' => 'Offline Contact']);
        OnlineStatusTracker::updatePresence($account->id, 'Contact', $onlineContact->id);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/active")
            ->assertOk();

        expect($response->json('meta.count'))->toBe(1)
            ->and($response->json('payload.0.id'))->toBe($onlineContact->id)
            ->and($response->json('payload.*.id'))->not->toContain($offlineContact->id);
    });
});

describe('GET /api/v1/accounts/{id}/contacts/{contactId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        $this->getJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}")->assertUnauthorized();
    });

    it('shows the contact', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->withEmail()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}")
            ->assertOk()
            ->assertJsonPath('payload.email', $contact->email)
            ->assertJsonPath('payload.availability_status', 'offline');
    });

    it('returns not found for contact of another account', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $otherContact = Contact::factory()->create();

        $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/contacts/{$otherContact->id}")
            ->assertNotFound();
    });
});

describe('POST /api/v1/accounts/{id}/contacts', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->postJson("/api/v1/accounts/{$account->id}/contacts", ['name' => 'test'])->assertUnauthorized();

        expect(Contact::query()->count())->toBe(0);
    });

    it('creates the contact', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts", [
                'name' => 'test',
                'custom_attributes' => ['test' => 'test', 'test1' => 'test1'],
            ])
            ->assertOk();

        expect(Contact::query()->count())->toBe(1)
            ->and($response->json('payload.contact.custom_attributes'))
            ->toBe(['test' => 'test', 'test1' => 'test1']);
    });

    it('does not create the contact with a too long name', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts", ['name' => str_repeat('test', 999)])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Name is too long (maximum is 255 characters)');
    });

    it('rejects an invalid email format', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts", ['email' => '<2324234234'])
            ->assertStatus(422);

        expect($response->json('attributes'))->toContain('email');
    });

    it('rejects an invalid phone number format', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts", ['phone_number' => 'khong-phai-so'])
            ->assertStatus(422)
            ->assertJsonPath('message', __('errors.contacts.phone_number_invalid'));

        expect($response->json('attributes'))->toContain('phone_number');
    });

    it('báo lỗi số điện thoại bằng tiếng Việt khi giao diện tiếng Việt', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        app()->setLocale('vi');

        expect(__('errors.contacts.phone_number_invalid'))->toStartWith('Số điện thoại không hợp lệ');

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts", ['phone_number' => '09x12345678'])
            ->assertStatus(422)
            ->assertJsonPath('attributes', ['phone_number']);
    });

    it('lưu số Việt Nam gõ không mã nước ở dạng E.164', function (string $typed) {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts", ['name' => 'Khách', 'phone_number' => $typed])
            ->assertOk()
            ->assertJsonPath('payload.contact.phone_number', '+84912345678');
    })->with(['0912345678', '84912345678', '+84912345678', '912345678', '0912 345 678']);

    it('giữ nguyên số nước ngoài có mã nước', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts", ['phone_number' => '+1 202 555 0123'])
            ->assertOk()
            ->assertJsonPath('payload.contact.phone_number', '+12025550123');
    });

    it('creates the contact inbox when inbox id is passed', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts", [
                'name' => 'test', 'inbox_id' => $inbox->id,
            ])
            ->assertOk();

        expect(ContactInbox::query()->count())->toBe(1)
            ->and($response->json('payload.contact_inbox.source_id'))->not->toBeNull();
    });
});

describe('PATCH /api/v1/accounts/{id}/contacts/{contactId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        $this->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", ['name' => 'Test Blub'])
            ->assertUnauthorized();
    });

    it('updates the contact and merges jsonb attributes', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create([
            'account_id' => $account->id,
            'custom_attributes' => ['test' => 'test', 'test1' => 'test1'],
            'additional_attributes' => ['attr1' => 'attr1', 'attr2' => 'attr2'],
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", [
                'name' => 'Test Blub',
                'custom_attributes' => ['test' => 'new test', 'test2' => 'test2'],
                'additional_attributes' => ['attr2' => 'new attr2', 'attr3' => 'attr3'],
            ])
            ->assertOk();

        $contact->refresh();
        expect($contact->name)->toBe('Test Blub')
            ->and($contact->custom_attributes)->toBe(['test' => 'new test', 'test1' => 'test1', 'test2' => 'test2'])
            ->and($contact->additional_attributes)
            ->toBe(['attr1' => 'attr1', 'attr2' => 'new attr2', 'attr3' => 'attr3']);
    });

    it('prevents update of contact of another account', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $otherContact = Contact::factory()->create();

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$otherContact->id}", ['name' => 'Test Blub'])
            ->assertNotFound();
    });

    it('prevents updating with an existing email', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $other = Contact::factory()->create(['account_id' => $account->id, 'email' => 'test1@example.com']);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", ['email' => $other->email])
            ->assertStatus(422);

        expect($response->json('attributes'))->toContain('email');
    });

    it('sửa số điện thoại bằng số không mã nước thì lưu và trả về dạng E.164', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", ['phone_number' => '0912345678'])
            ->assertOk()
            ->assertJsonPath('payload.phone_number', '+84912345678');

        expect($contact->refresh()->phone_number)->toBe('+84912345678');
    });

    it('chặn trùng khi cùng một số gõ theo kiểu khác', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        Contact::factory()->create(['account_id' => $account->id, 'phone_number' => '+84912345678']);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", ['phone_number' => '0912 345 678'])
            ->assertStatus(422);

        expect($response->json('attributes'))->toContain('phone_number');
    });

    it('prevents updating with an existing phone number', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $other = Contact::factory()->create(['account_id' => $account->id, 'phone_number' => '+12000000']);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", ['phone_number' => $other->phone_number])
            ->assertStatus(422);

        expect($response->json('attributes'))->toContain('phone_number');
    });

    it('updates avatar', function () {
        Storage::fake('public');
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->post("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", [
                '_method' => 'PATCH',
                'name' => 'Test Blub',
                'avatar' => UploadedFile::fake()->image('avatar.png'),
            ])
            ->assertOk();

        expect($contact->refresh()->avatar)->not->toBeNull();
    });

    it('updates avatar with avatar_url', function () {
        Queue::fake();
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", [
                'name' => 'Test Blub',
                'avatar_url' => 'http://example.com/avatar.png',
            ])
            ->assertOk();

        Queue::assertPushed(AvatarFromUrlJob::class);
    });

    it('allows blocking and unblocking of contact', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", ['blocked' => true])
            ->assertOk();
        expect($contact->refresh()->blocked)->toBeTrue();

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}", ['blocked' => false])
            ->assertOk();
        expect($contact->refresh()->blocked)->toBeFalse();
    });
});

describe('DELETE /api/v1/accounts/{id}/contacts/{contactId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        $this->deleteJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}")->assertUnauthorized();
    });

    it('deletes the contact for administrator user', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}")
            ->assertOk();

        expect(Contact::query()->whereKey($contact->id)->exists())->toBeFalse()
            ->and(ContactInbox::query()->where('contact_id', $contact->id)->exists())->toBeFalse();
    });

    it('returns unauthorized for agent user', function () {
        $account = Account::factory()->create();
        $agent = contactUserOf($account);
        $contact = Contact::factory()->create(['account_id' => $account->id]);

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}")
            ->assertUnauthorized();

        expect(Contact::query()->whereKey($contact->id)->exists())->toBeTrue();
    });
});

describe('DELETE /api/v1/accounts/{id}/contacts/{contactId} while online', function () {
    it('does not delete the contact if online', function () {
        $account = Account::factory()->create();
        OnlineStatusTracker::clearAccount($account->id);
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id, 'name' => 'john DOE']);
        OnlineStatusTracker::updatePresence($account->id, 'Contact', $contact->id);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}")
            ->assertStatus(422)
            ->assertJson(['message' => 'John doe is Online, please try again later']);

        expect($contact->fresh())->not->toBeNull();
    });
});

describe('POST /api/v1/accounts/{id}/contacts/{contactId}/destroy_custom_attributes', function () {
    it('deletes the custom attribute', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create([
            'account_id' => $account->id,
            'custom_attributes' => ['keep' => 'yes', 'drop' => 'no'],
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}/destroy_custom_attributes", [
                'custom_attributes' => ['drop'],
            ])
            ->assertOk();

        expect($contact->refresh()->custom_attributes)->toBe(['keep' => 'yes']);
    });
});

describe('DELETE /api/v1/accounts/{id}/contacts/{contactId}/avatar', function () {
    it('deletes contact avatar', function () {
        Storage::fake('public');
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $contact->replaceAvatar(UploadedFile::fake()->image('avatar.png'));

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}/avatar")
            ->assertOk();

        expect($contact->refresh()->avatar)->toBeNull();
    });

    it('báo contact.updated với thumbnail rỗng cho người đang xem và trả liên hệ đã xoá ảnh', function () {
        Storage::fake('public');
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $contact->replaceAvatar(UploadedFile::fake()->image('avatar.png'));
        Queue::fake();

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}/avatar")
            ->assertOk()
            ->assertJsonPath('payload.id', $contact->id)
            ->assertJsonPath('payload.thumbnail', '');

        Queue::assertPushed(ActionCableBroadcastJob::class, fn (ActionCableBroadcastJob $job) => $job->eventName === 'contact.updated'
            && $job->members === ["account_{$account->id}"]
            && $job->data['id'] === $contact->id
            && $job->data['thumbnail'] === '');
    });
});

describe('POST /api/v1/accounts/{id}/contacts/{contactId}/contact_inboxes', function () {
    it('creates a contact inbox with the given source id', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}/contact_inboxes", [
                'inbox_id' => $inbox->id, 'source_id' => 'test-source',
            ])
            ->assertOk()
            ->assertJsonPath('source_id', 'test-source');

        expect(ContactInbox::query()->where('contact_id', $contact->id)->count())->toBe(1);
    });

    it('generates a source id when none is provided', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}/contact_inboxes", [
                'inbox_id' => $inbox->id,
            ])
            ->assertOk();

        expect($response->json('source_id'))->toBeUuid();
    });

    it('returns unauthorized for agent who is not an inbox member', function () {
        $account = Account::factory()->create();
        $agent = contactUserOf($account);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}/contact_inboxes", [
                'inbox_id' => $inbox->id,
            ])
            ->assertUnauthorized();
    });

    it('returns not found for an inbox of another account', function () {
        $account = Account::factory()->create();
        $admin = contactUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $otherInbox = Inbox::factory()->create();

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/contacts/{$contact->id}/contact_inboxes", [
                'inbox_id' => $otherInbox->id,
            ])
            ->assertNotFound();
    });
});
