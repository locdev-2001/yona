<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Tests\Fixtures\FakeMailDomainResolver;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id, 'role' => AccountUser::ROLE_AGENT]);
    FakeMailDomainResolver::bind(['yona.vn' => ['aspmx.l.google.com']]);
});

it('trả kết quả kiểm địa chỉ đúng hình dạng hợp đồng', function (string $email, bool $deliverable, ?string $reason) {
    $this->actingAs($this->agent)
        ->postJson("/api/v1/accounts/{$this->account->id}/email_addresses/verify", ['email' => $email])
        ->assertOk()
        ->assertExactJson(['email' => $email, 'deliverable' => $deliverable, 'reason' => $reason]);
})->with([
    'địa chỉ thật' => ['khach@yona.vn', true, null],
    'sai cú pháp' => ['khach@@yona', false, 'invalid_syntax'],
    'tên miền không tồn tại' => ['khach@khong-co-that.vn', false, 'domain_not_found'],
]);

it('thiếu email thì 422, chưa đăng nhập thì 401', function () {
    $this->actingAs($this->agent)
        ->postJson("/api/v1/accounts/{$this->account->id}/email_addresses/verify", [])
        ->assertUnprocessable();

    auth()->logout();

    $this->postJson("/api/v1/accounts/{$this->account->id}/email_addresses/verify", ['email' => 'khach@yona.vn'])
        ->assertUnauthorized();
});
