<?php

use App\Models\Account;
use App\Models\Contact;
use App\Support\AnonymousName;

function animalsOf(string $locale): array
{
    $strings = require base_path("lang/$locale/contacts.php");

    return $strings['anonymous']['animals'];
}

it('sinh tên tiếng Việt dạng "<con vật> ẩn danh" theo locale của account', function () {
    $account = Account::factory()->create(['locale' => 'vi']);

    $name = AnonymousName::forAccount($account);

    expect($name)->toEndWith(' ẩn danh')
        ->and(mb_substr($name, 0, -mb_strlen(' ẩn danh')))->toBeIn(animalsOf('vi'));
});

it('sinh tên tiếng Anh cho account locale en', function () {
    $account = Account::factory()->create(['locale' => 'en']);

    $name = AnonymousName::forAccount($account);

    expect($name)->toStartWith('Anonymous ')
        ->and(mb_substr($name, mb_strlen('Anonymous ')))->toBeIn(animalsOf('en'));
});

it('quay về locale mặc định khi account chưa đặt ngôn ngữ', function () {
    $account = Account::factory()->create(['locale' => '']);

    expect(AnonymousName::forAccount($account))->toStartWith('Anonymous ');
});

it('không trùng tên trong cùng account cho tới khi cạn danh sách', function () {
    $account = Account::factory()->create(['locale' => 'vi']);
    $total = count(animalsOf('vi'));

    $names = [];
    for ($i = 0; $i < $total; $i++) {
        $name = AnonymousName::forAccount($account);
        Contact::factory()->create(['account_id' => $account->id, 'name' => $name]);
        $names[] = $name;
    }

    expect(array_unique($names))->toHaveCount($total);
});

it('thêm hậu tố số khi mọi tên trần đã có người dùng', function () {
    $account = Account::factory()->create(['locale' => 'vi']);
    foreach (animalsOf('vi') as $animal) {
        Contact::factory()->create(['account_id' => $account->id, 'name' => "$animal ẩn danh"]);
    }

    $name = AnonymousName::forAccount($account);

    expect($name)->toEndWith(' ẩn danh 2')
        ->and(mb_substr($name, 0, -mb_strlen(' ẩn danh 2')))->toBeIn(animalsOf('vi'));
});

it('chỉ tránh trùng trong phạm vi account của mình', function () {
    $account = Account::factory()->create(['locale' => 'vi']);
    $other = Account::factory()->create(['locale' => 'vi']);
    foreach (animalsOf('vi') as $animal) {
        Contact::factory()->create(['account_id' => $other->id, 'name' => "$animal ẩn danh"]);
    }

    expect(AnonymousName::forAccount($account))->toEndWith(' ẩn danh')
        ->and(AnonymousName::forAccount($account))->not->toEndWith(' ẩn danh 2');
});

it('cung cấp đủ tên dễ thương cho cả hai locale, không trùng nghĩa', function () {
    $vietnamese = animalsOf('vi');
    $english = animalsOf('en');

    expect(count($vietnamese))->toBeGreaterThanOrEqual(80)
        ->and(array_unique($vietnamese))->toHaveCount(count($vietnamese))
        ->and(array_unique($english))->toHaveCount(count($english))
        ->and(count($english))->toBe(count($vietnamese));
});

// Avatar chữ cái của FE (components-next/avatar/Avatar.tsx#getInitials) tách theo khoảng
// trắng và lấy 2 chữ đầu, nên "Gấu mèo ẩn danh" ra "GM" chứ không phải "G" — giữ nguyên
// hành vi gốc, chỉ khoá lại để không ai đổi tên thành dạng gây chữ tắt vô nghĩa.
it('tên mới luôn bắt đầu bằng chữ cái để avatar chữ cái có nghĩa', function () {
    $account = Account::factory()->create(['locale' => 'vi']);

    $name = AnonymousName::forAccount($account);

    expect(preg_match('/^\p{Lu}/u', $name))->toBe(1);
});

it('nhận ra tên do chính nó sinh, kể cả có hậu tố số, và không nhầm tên thật', function (string $name, bool $generated) {
    $account = Account::factory()->create(['locale' => 'vi']);

    expect(AnonymousName::isGenerated($account, str_replace('{animal}', animalsOf('vi')[0], $name)))->toBe($generated);
})->with([
    'tên trần' => ['{animal} ẩn danh', true],
    'tên có số' => ['{animal} ẩn danh 12', true],
    'tên thật' => ['Nguyễn Thị Lan', false],
    'chỉ giống một phần' => ['{animal} ẩn danh nhà bên', false],
]);
