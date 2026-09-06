<?php

use App\Models\Account;
use App\Models\Contact;

function haikunatedContact(Account $account, string $name): Contact
{
    return Contact::factory()->create(['account_id' => $account->id, 'name' => $name]);
}

it('đổi tên contact còn mang tên haikunator sang tên dễ đọc', function () {
    $account = Account::factory()->create(['locale' => 'vi']);
    $contact = haikunatedContact($account, 'odd-wave-872');

    $this->artisan('contacts:rename-anonymous')->assertSuccessful();

    expect($contact->refresh()->name)->toEndWith(' ẩn danh');
});

it('không đụng tới tên không khớp mẫu haikunator', function () {
    $account = Account::factory()->create(['locale' => 'vi']);
    $keep = collect([
        'Nguyễn Văn A',
        'crimson-tooth',
        'Crimson-Tooth-760',
        'odd wave 872',
        'Gấu mèo ẩn danh',
    ])->map(fn (string $name) => haikunatedContact($account, $name));

    $this->artisan('contacts:rename-anonymous')->assertSuccessful();

    expect($keep->map->fresh()->pluck('name')->all())
        ->toBe(['Nguyễn Văn A', 'crimson-tooth', 'Crimson-Tooth-760', 'odd wave 872', 'Gấu mèo ẩn danh']);
});

it('chạy lại lần hai không đổi gì thêm', function () {
    $account = Account::factory()->create(['locale' => 'vi']);
    $contact = haikunatedContact($account, 'crimson-tooth-760');

    $this->artisan('contacts:rename-anonymous')->assertSuccessful();
    $afterFirstRun = $contact->refresh()->name;

    $this->artisan('contacts:rename-anonymous')->assertSuccessful();

    expect($contact->refresh()->name)->toBe($afterFirstRun);
});

it('--dry-run không ghi gì', function () {
    $account = Account::factory()->create(['locale' => 'vi']);
    $contact = haikunatedContact($account, 'misty-lake-421');

    $this->artisan('contacts:rename-anonymous', ['--dry-run' => true])->assertSuccessful();

    expect($contact->refresh()->name)->toBe('misty-lake-421');
});

it('--account chỉ xử lý account được chọn', function () {
    $target = Account::factory()->create(['locale' => 'vi']);
    $untouched = Account::factory()->create(['locale' => 'vi']);
    $renamed = haikunatedContact($target, 'odd-wave-872');
    $kept = haikunatedContact($untouched, 'odd-wave-873');

    $this->artisan('contacts:rename-anonymous', ['--account' => [$target->id]])->assertSuccessful();

    expect($renamed->refresh()->name)->toEndWith(' ẩn danh')
        ->and($kept->refresh()->name)->toBe('odd-wave-873');
});

it('không đặt trùng tên cho nhiều contact trong cùng account', function () {
    $account = Account::factory()->create(['locale' => 'vi']);
    foreach (range(1, 20) as $index) {
        haikunatedContact($account, "odd-wave-$index");
    }

    $this->artisan('contacts:rename-anonymous')->assertSuccessful();

    $names = $account->contacts()->pluck('name');

    expect($names)->toHaveCount(20)
        ->and($names->unique())->toHaveCount(20);
});
