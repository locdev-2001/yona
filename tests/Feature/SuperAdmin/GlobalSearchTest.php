<?php

use App\Models\Account;
use App\Models\Contact;
use App\Models\Inbox;
use App\Models\SuperAdmin;
use App\Models\User;

// API tìm nhanh cho bảng lệnh Ctrl+K của console.
beforeEach(function () {
    $this->superAdmin = SuperAdmin::factory()->withMfa()->create();
});

it('tìm account, người dùng, hộp thư, liên hệ theo tên, email, số điện thoại', function () {
    $account = Account::factory()->create(['name' => 'Hoa Sen Shop']);
    $user = User::factory()->create(['name' => 'Chị Sen', 'email' => 'sen@example.com']);
    $inbox = Inbox::factory()->zalo()->create(['account_id' => $account->id, 'name' => 'Zalo Sen']);
    $contact = Contact::factory()->create(['account_id' => $account->id, 'name' => 'Khách quen', 'phone_number' => '+84901234567']);

    $results = $this->actingAs($this->superAdmin, 'super_admin')
        ->getJson('/admin/api/search?q=sen')
        ->assertOk()
        ->json('data');

    expect(collect($results)->map(fn ($result) => "{$result['type']}:{$result['id']}")->all())
        ->toContain("account:{$account->id}", "user:{$user->id}", "inbox:{$inbox->id}")
        ->and(collect($results)->firstWhere('type', 'account')['url'])->toBe("/admin/accounts/{$account->id}/overview");

    $byPhone = $this->getJson('/admin/api/search?q=090%20123%204567')->json('data');
    expect(collect($byPhone)->firstWhere('type', 'contact'))->toMatchArray([
        'id' => $contact->id,
        'url' => "/admin/data/contacts?filter[id]={$contact->id}",
    ]);
});

it('số nguyên khớp đúng id, chuỗi ngắn hoặc ký tự đại diện không quét bảng', function () {
    $account = Account::factory()->create(['name' => 'Không liên quan']);

    $this->actingAs($this->superAdmin, 'super_admin');

    expect(collect($this->getJson("/admin/api/search?q={$account->id}")->json('data'))->where('type', 'account')->pluck('id')->all())
        ->toContain($account->id);
    expect($this->getJson('/admin/api/search?q=a')->json('data'))->toBe([]);
    expect($this->getJson('/admin/api/search?q=%25%25')->json('data'))->toBe([]);
    $this->getJson('/admin/api/search?q[]=x')->assertOk()->assertJson(['data' => []]);
});

it('mỗi loại tối đa 5 kết quả', function () {
    Account::factory()->count(7)->sequence(fn ($sequence) => ['name' => "Tiệm bánh {$sequence->index}"])->create();

    $results = $this->actingAs($this->superAdmin, 'super_admin')->getJson('/admin/api/search?q=Ti%E1%BB%87m')->json('data');

    expect(collect($results)->where('type', 'account'))->toHaveCount(5);
});

it('khách chưa đăng nhập không gọi được API tìm kiếm', function () {
    $this->getJson('/admin/api/search?q=abc')->assertUnauthorized();
});
