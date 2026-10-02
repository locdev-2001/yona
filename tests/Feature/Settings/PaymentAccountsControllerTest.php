<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\PaymentAccount;
use App\Models\User;
use App\Support\VietQr\Payload;

function paymentAccountUser(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = paymentAccountUser($this->account, AccountUser::ROLE_ADMINISTRATOR);
    $this->agent = paymentAccountUser($this->account, AccountUser::ROLE_AGENT);
});

describe('GET /api/v1/accounts/{id}/payment_accounts', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/payment_accounts")->assertUnauthorized();
    });

    it('admin sees every account, agent only the ones open to all agents', function () {
        PaymentAccount::factory()->create(['account_id' => $this->account->id, 'account_number' => '1111111111', 'allow_all_agents' => true]);
        PaymentAccount::factory()->create(['account_id' => $this->account->id, 'account_number' => '2222222222', 'allow_all_agents' => false]);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/payment_accounts")
            ->assertOk()
            ->assertJsonCount(2, 'payload');

        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/payment_accounts")
            ->assertOk()
            ->assertJsonCount(1, 'payload')
            ->assertJsonPath('payload.0.account_number', '1111111111');
    });

    it('never returns another tenant\'s accounts', function () {
        $otherAccount = Account::factory()->create();
        PaymentAccount::factory()->create(['account_id' => $otherAccount->id]);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/payment_accounts")
            ->assertOk()
            ->assertJsonCount(0, 'payload');
    });
});

describe('POST /api/v1/accounts/{id}/payment_accounts', function () {
    it('returns unauthorized for an agent', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/payment_accounts", [
                'bank_bin' => '970436',
                'account_number' => '1023456789',
                'account_name' => 'HKD GOM MOC',
            ])
            ->assertUnauthorized();

        expect(PaymentAccount::query()->count())->toBe(0);
    });

    it('admin creates an account, name normalized to uppercase without diacritics', function () {
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/payment_accounts", [
                'bank_bin' => '970436',
                'account_number' => '1023456789',
                'account_name' => 'Hộ kinh doanh Gốm Mộc',
                'memo_template' => '{ma_hoi_thoai}',
            ])
            ->assertOk();

        expect($response->json('account_name'))->toBe('HO KINH DOANH GOM MOC')
            ->and($response->json('bank_name'))->toBe('Vietcombank')
            ->and($response->json('is_default'))->toBeTrue(); // tài khoản đầu tiên tự thành mặc định
    });

    it('rejects an unknown bank BIN', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/payment_accounts", [
                'bank_bin' => '999999',
                'account_number' => '1023456789',
                'account_name' => 'HKD GOM MOC',
            ])
            ->assertStatus(422);
    });

    it('rejects a duplicate bank + account number within the same tenant', function () {
        PaymentAccount::factory()->create(['account_id' => $this->account->id, 'bank_bin' => '970436', 'account_number' => '1023456789']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/payment_accounts", [
                'bank_bin' => '970436',
                'account_number' => '1023456789',
                'account_name' => 'KHAC TEN',
            ])
            ->assertStatus(422);
    });

    it('setting a new default clears the previous one, inside a transaction', function () {
        $first = PaymentAccount::factory()->create(['account_id' => $this->account->id, 'account_number' => '1111111111', 'is_default' => true]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/payment_accounts", [
                'bank_bin' => '970407',
                'account_number' => '2222222222',
                'account_name' => 'TAI KHOAN HAI',
                'is_default' => true,
            ])
            ->assertOk()
            ->assertJsonPath('is_default', true);

        expect($first->fresh()->is_default)->toBeFalse()
            ->and(PaymentAccount::query()->where('account_id', $this->account->id)->where('is_default', true)->count())->toBe(1);
    });
});

describe('PUT /api/v1/accounts/{id}/payment_accounts/{id}', function () {
    it('returns unauthorized for an agent', function () {
        $paymentAccount = PaymentAccount::factory()->create(['account_id' => $this->account->id]);

        $this->actingAs($this->agent)
            ->putJson("/api/v1/accounts/{$this->account->id}/payment_accounts/{$paymentAccount->id}", [
                'bank_bin' => $paymentAccount->bank_bin,
                'account_number' => $paymentAccount->account_number,
                'account_name' => 'HACKED',
            ])
            ->assertUnauthorized();
    });

    it('admin updates an account', function () {
        $paymentAccount = PaymentAccount::factory()->create(['account_id' => $this->account->id]);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/accounts/{$this->account->id}/payment_accounts/{$paymentAccount->id}", [
                'bank_bin' => $paymentAccount->bank_bin,
                'account_number' => $paymentAccount->account_number,
                'account_name' => 'TEN MOI',
                'memo_template' => 'MOI',
                'allow_all_agents' => false,
            ])
            ->assertOk()
            ->assertJsonPath('account_name', 'TEN MOI')
            ->assertJsonPath('allow_all_agents', false);
    });

    it('cannot update another tenant\'s account', function () {
        $otherAccount = Account::factory()->create();
        $paymentAccount = PaymentAccount::factory()->create(['account_id' => $otherAccount->id]);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/accounts/{$this->account->id}/payment_accounts/{$paymentAccount->id}", [
                'bank_bin' => $paymentAccount->bank_bin,
                'account_number' => $paymentAccount->account_number,
                'account_name' => 'X',
            ])
            ->assertNotFound();
    });
});

describe('DELETE /api/v1/accounts/{id}/payment_accounts/{id}', function () {
    it('returns unauthorized for an agent', function () {
        $paymentAccount = PaymentAccount::factory()->create(['account_id' => $this->account->id]);

        $this->actingAs($this->agent)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/payment_accounts/{$paymentAccount->id}")
            ->assertUnauthorized();
    });

    it('admin deletes an account and promotes another to default', function () {
        $default = PaymentAccount::factory()->create(['account_id' => $this->account->id, 'account_number' => '1111111111', 'is_default' => true]);
        $other = PaymentAccount::factory()->create(['account_id' => $this->account->id, 'account_number' => '2222222222', 'is_default' => false]);

        // noContent(200): tương đương `head :ok` của Rails, không phải 204 chuẩn.
        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/payment_accounts/{$default->id}")
            ->assertOk();

        expect(PaymentAccount::query()->whereKey($default->id)->exists())->toBeFalse()
            ->and($other->fresh()->is_default)->toBeTrue();
    });
});

describe('GET /api/v1/accounts/{id}/payment_accounts/{id}/preview', function () {
    it('returns a qr_payload string', function () {
        $paymentAccount = PaymentAccount::factory()->create(['account_id' => $this->account->id]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/payment_accounts/{$paymentAccount->id}/preview?amount=480000")
            ->assertOk();

        expect($response->json('qr_payload'))->toContain('970436')->toContain($paymentAccount->account_number);
    });

    it('agent without allow_all_agents cannot preview', function () {
        $paymentAccount = PaymentAccount::factory()->create(['account_id' => $this->account->id, 'allow_all_agents' => false]);

        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/payment_accounts/{$paymentAccount->id}/preview")
            ->assertNotFound();
    });
});

it('GET /api/v1/accounts/{id}/payment_accounts/banks trả danh sách ngân hàng tĩnh', function () {
    $response = $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/payment_accounts/banks")
        ->assertOk();

    expect($response->json('payload'))->not->toBeEmpty();
});

describe('GET /api/v1/accounts/{id}/payment_accounts/preview (tài khoản chưa lưu)', function () {
    it('quản trị viên nhận đúng payload máy chủ sẽ gắn vào tin, không lưu gì', function () {
        $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/payment_accounts/preview?bank_bin=970403&account_number=0123456789&amount=150000&memo=GM 12")
            ->assertOk()
            ->assertJsonPath('qr_payload', Payload::build('970403', '0123456789', 150000, 'GM 12'));

        expect(PaymentAccount::count())->toBe(0);
    });

    it('từ chối nhân viên và từ chối ngân hàng hoặc số tài khoản không hợp lệ', function () {
        $url = "/api/v1/accounts/{$this->account->id}/payment_accounts/preview";

        $this->actingAs($this->agent)->getJson("{$url}?bank_bin=970403&account_number=0123456789")->assertUnauthorized();
        $this->actingAs($this->admin)->getJson("{$url}?bank_bin=111111&account_number=0123456789")->assertUnprocessable();
        $this->actingAs($this->admin)->getJson("{$url}?bank_bin=970403&account_number=12ab")->assertUnprocessable();
    });
});
