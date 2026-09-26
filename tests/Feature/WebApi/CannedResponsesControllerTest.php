<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\CannedResponse;
use App\Models\PaymentAccount;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/canned_responses_controller_spec.rb,
// cộng các case validate (bản gốc kiểm ở model, bản port kiểm ở tầng nhận input).

function createCannedResponse(Account $account, string $shortCode, string $content): CannedResponse
{
    return CannedResponse::query()->create([
        'account_id' => $account->id,
        'short_code' => $shortCode,
        'content' => $content,
    ]);
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->cannedResponse = createCannedResponse(
        $this->account,
        'name-short-code',
        'Hey {{ contact.name }}, Thanks for reaching out'
    );

    $this->agent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->agent->id,
        'role' => AccountUser::ROLE_AGENT,
    ]);
});

describe('GET /api/v1/accounts/{id}/canned_responses', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/canned_responses")->assertUnauthorized();
    });

    it('returns all the canned responses as a bare array', function () {
        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/canned_responses")
            ->assertOk();

        expect($response->json())->toBe([[
            'id' => $this->cannedResponse->id,
            'account_id' => $this->account->id,
            'short_code' => 'name-short-code',
            'content' => 'Hey {{ contact.name }}, Thanks for reaching out',
            'content_type' => null,
            'content_attributes' => null,
            'created_at' => $this->cannedResponse->created_at->clone()->utc()->format('Y-m-d\TH:i:s.v\Z'),
            'updated_at' => $this->cannedResponse->updated_at->clone()->utc()->format('Y-m-d\TH:i:s.v\Z'),
        ]]);
    });

    it('ranks the canned responses the user searched for', function () {
        createCannedResponse($this->account, 'short-code', 'Great! Looking forward');
        $shortCodeContains = createCannedResponse($this->account, 'content-with-thanks', 'Thanks for reaching out');
        $shortCodeStartsWith = createCannedResponse($this->account, 'Thanks', 'Thanks for reaching out');

        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/canned_responses?search=thanks")
            ->assertOk();

        expect(array_column($response->json(), 'id'))
            ->toBe([$shortCodeStartsWith->id, $shortCodeContains->id, $this->cannedResponse->id]);
    });

    it('ignores null bytes in the search string', function () {
        $matching = createCannedResponse($this->account, 'unique', 'Unique response');

        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/canned_responses?search=uni%00que")
            ->assertOk();

        expect(array_column($response->json(), 'id'))->toBe([$matching->id]);
    });

    it('never leaks canned responses of another account', function () {
        $otherAccount = Account::factory()->create();
        createCannedResponse($otherAccount, 'other', 'Other account response');

        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/canned_responses")
            ->assertOk();

        expect($response->json())->toHaveCount(1);
    });
});

describe('POST /api/v1/accounts/{id}/canned_responses', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->postJson("/api/v1/accounts/{$this->account->id}/canned_responses")->assertUnauthorized();
    });

    it('creates a new canned response from a flat body', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => 'short',
                'content' => 'content',
            ])
            ->assertOk()
            ->assertJsonPath('short_code', 'short')
            ->assertJsonPath('content', 'content')
            ->assertJsonPath('account_id', $this->account->id);

        expect($this->account->cannedResponses()->count())->toBe(2);
    });

    it('creates a new canned response from a wrapped body', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'canned_response' => ['short_code' => 'wrapped', 'content' => 'content'],
            ])
            ->assertOk()
            ->assertJsonPath('short_code', 'wrapped');
    });

    it('rejects a duplicate short code inside the account', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => 'name-short-code',
                'content' => 'content',
            ])
            ->assertStatus(422)
            ->assertExactJson([
                'message' => 'Short code has already been taken',
                'attributes' => ['short_code'],
            ]);
    });

    it('allows the same short code in another account', function () {
        $otherAccount = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $otherAccount->id, 'user_id' => $this->agent->id]);

        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$otherAccount->id}/canned_responses", [
                'short_code' => 'name-short-code',
                'content' => 'content',
            ])
            ->assertOk();
    });

    it('reports both blank attributes at once', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => '',
                'content' => '',
            ])
            ->assertStatus(422)
            ->assertExactJson([
                'message' => "Content can't be blank, Short code can't be blank",
                'attributes' => ['content', 'short_code'],
            ]);
    });

    it('reports a missing param when the body carries nothing usable', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [])
            ->assertStatus(422)
            ->assertExactJson(['error' => 'param is missing or the value is empty: canned_response']);
    });

    it('creates a canned response with a valid card', function () {
        $response = $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => 'hoi-gio-nhan',
                'content' => 'Bạn muốn nhận hàng khi nào ạ?',
                'content_type' => 'input_select',
                'content_attributes' => ['items' => [['title' => 'Sáng'], ['title' => 'Tối']]],
            ])
            ->assertOk();

        expect($response->json('content_type'))->toBe('input_select')
            ->and($response->json('content_attributes.items'))->toBe([
                ['title' => 'Sáng', 'value' => 'Sáng'],
                ['title' => 'Tối', 'value' => 'Tối'],
            ]);
    });

    it('creates a card canned response without content when the card type allows it', function () {
        $response = $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => 'sp-binh-lam',
                'content_type' => 'cards',
                'content_attributes' => ['items' => [['title' => 'Bình men lam']]],
            ])
            ->assertOk();

        expect($response->json('content'))->toBeNull()
            ->and($response->json('content_attributes.items.0.title'))->toBe('Bình men lam');
    });

    it('rejects an invalid card payload with 422', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => 'hoi-thieu-luachon',
                'content_type' => 'input_select',
                'content_attributes' => ['items' => []],
            ])
            ->assertStatus(422);

        expect($this->account->cannedResponses()->where('short_code', 'hoi-thieu-luachon')->exists())->toBeFalse();
    });

    it('rejects an unknown content_type with 422', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => 'loai-la',
                'content_type' => 'khong_ton_tai',
                'content_attributes' => [],
            ])
            ->assertStatus(422);
    });

    it('a bank_transfer canned response never stores the account number or QR', function () {
        $paymentAccount = PaymentAccount::factory()->create([
            'account_id' => $this->account->id,
            'bank_bin' => '970436',
            'account_number' => '1023456789',
            'account_name' => 'HKD GOM MOC',
        ]);

        $response = $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => 'ck-tra-truoc',
                'content_type' => 'bank_transfer',
                'content_attributes' => [
                    'payment_account_id' => $paymentAccount->id,
                    'amount' => 480000,
                    'memo' => 'GM1024',
                    // Client tự khai — phải bị bỏ qua hoàn toàn, không được lưu.
                    'account_number' => 'FAKE999999',
                    'qr_payload' => 'QR-GIA-MAO',
                ],
            ])
            ->assertOk();

        expect($response->json('content_attributes'))->toBe([
            'payment_account_id' => $paymentAccount->id,
            'amount' => 480000,
            'memo' => 'GM1024',
        ]);

        $stored = CannedResponse::query()->where('short_code', 'ck-tra-truoc')->sole();
        expect($stored->content_attributes)->not->toHaveKeys(['account_number', 'qr_payload', 'bank_name', 'account_name']);
    });

    it('rejects a bank_transfer card pointing at a payment account of another tenant', function () {
        $otherAccount = Account::factory()->create();
        $foreignPaymentAccount = PaymentAccount::factory()->create(['account_id' => $otherAccount->id]);

        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/canned_responses", [
                'short_code' => 'ck-tenant-khac',
                'content_type' => 'bank_transfer',
                'content_attributes' => ['payment_account_id' => $foreignPaymentAccount->id],
            ])
            ->assertStatus(422);
    });
});

describe('PUT /api/v1/accounts/{id}/canned_responses/{id}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->putJson("/api/v1/accounts/{$this->account->id}/canned_responses/{$this->cannedResponse->id}")
            ->assertUnauthorized();
    });

    it('updates an existing canned response partially', function () {
        $this->actingAs($this->agent)
            ->putJson(
                "/api/v1/accounts/{$this->account->id}/canned_responses/{$this->cannedResponse->id}",
                ['short_code' => 'B']
            )
            ->assertOk()
            ->assertJsonPath('short_code', 'B')
            ->assertJsonPath('content', 'Hey {{ contact.name }}, Thanks for reaching out');

        expect($this->cannedResponse->refresh()->short_code)->toBe('B');
    });

    it('keeps its own short code valid on update', function () {
        $this->actingAs($this->agent)
            ->putJson(
                "/api/v1/accounts/{$this->account->id}/canned_responses/{$this->cannedResponse->id}",
                ['short_code' => 'name-short-code', 'content' => 'updated']
            )
            ->assertOk()
            ->assertJsonPath('content', 'updated');
    });

    it('rejects blanking the content', function () {
        $this->actingAs($this->agent)
            ->putJson(
                "/api/v1/accounts/{$this->account->id}/canned_responses/{$this->cannedResponse->id}",
                ['content' => '']
            )
            ->assertStatus(422)
            ->assertExactJson(['message' => "Content can't be blank", 'attributes' => ['content']]);
    });

    it('returns not found for a canned response of another account', function () {
        $otherAccount = Account::factory()->create();
        $foreign = createCannedResponse($otherAccount, 'foreign', 'content');

        $this->actingAs($this->agent)
            ->putJson(
                "/api/v1/accounts/{$this->account->id}/canned_responses/{$foreign->id}",
                ['short_code' => 'B']
            )
            ->assertNotFound();
    });
});

describe('DELETE /api/v1/accounts/{id}/canned_responses/{id}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->deleteJson("/api/v1/accounts/{$this->account->id}/canned_responses/{$this->cannedResponse->id}")
            ->assertUnauthorized();
    });

    it('destroys the canned response', function () {
        $this->actingAs($this->agent)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/canned_responses/{$this->cannedResponse->id}")
            ->assertOk();

        expect(CannedResponse::query()->count())->toBe(0);
    });

    it('returns not found for a canned response of another account', function () {
        $otherAccount = Account::factory()->create();
        $foreign = createCannedResponse($otherAccount, 'foreign', 'content');

        $this->actingAs($this->agent)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/canned_responses/{$foreign->id}")
            ->assertNotFound();

        expect(CannedResponse::query()->whereKey($foreign->id)->exists())->toBeTrue();
    });
});
