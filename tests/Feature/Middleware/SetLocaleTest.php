<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

function langCuaTrang(string $html): ?string
{
    preg_match('/<html\b[^>]*?\blang="([^"]+)"/', $html, $khop);

    return $khop[1] ?? null;
}

function nguoiDungCuaAccount(Account $account, array $uiSettings = []): User
{
    $user = User::factory()->create(['ui_settings' => $uiSettings]);
    AccountUser::factory()->administrator()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
    ]);

    return $user;
}

// SetLocale gọi App::setLocale() mà không đặt lại, nên ngôn ngữ của request
// trước còn đọng trong config ở request sau. Trước mỗi lần gọi phải ghim
// app.locale về phía NGƯỢC với account, nếu không sự rò rỉ đó sẽ cứu bài test.
//
// Route dashboard khai {account} là số nên tham số chỉ thành Account khi handler
// có type-hint Account. Controller nhận id thô từng rơi xuống app.locale — cùng
// một người dùng thấy màn này tiếng Việt, màn kia tiếng Anh.
it('mỗi màn nói đúng ngôn ngữ của account, kể cả route không bind model', function () {
    $duongDan = ['dashboard', 'settings/inboxes/new', 'contacts'];

    foreach ([['vi', 'en'], ['en', 'vi']] as [$cuaAccount, $nguocLai]) {
        $account = Account::factory()->create(['locale' => $cuaAccount]);
        $user = nguoiDungCuaAccount($account);

        foreach ($duongDan as $d) {
            config()->set('app.locale', $nguocLai);
            $html = $this->actingAs($user)->get("/app/accounts/{$account->id}/{$d}")->assertOk()->getContent();
            expect(langCuaTrang($html))->toBe($cuaAccount, "sai ngôn ngữ ở /{$d} của account {$cuaAccount}");
        }
    }
});

it('ngôn ngữ người dùng tự chọn thắng ngôn ngữ account', function () {
    $account = Account::factory()->create(['locale' => 'en']);
    $user = nguoiDungCuaAccount($account, ['locale' => 'vi']);

    $html = $this->actingAs($user)
        ->get("/app/accounts/{$account->id}/settings/inboxes/new")
        ->assertOk()
        ->getContent();

    expect(langCuaTrang($html))->toBe('vi');
});

it('account tạo mới lấy APP_LOCALE, không phải en ghim cứng trong model', function () {
    config()->set('app.locale', 'vi');

    expect(Account::create(['name' => 'Không truyền locale'])->locale)->toBe('vi');
});
