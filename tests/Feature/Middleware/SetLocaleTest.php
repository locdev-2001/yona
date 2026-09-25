<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Tests\Support\WidgetSession;

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

describe('trang widget', function () {
    // Widget in ra <html lang> theo account chủ hộp thư; test ghim app.locale về
    // phía ngược lại để chắc ngôn ngữ đến từ đúng nguồn.
    $moWidget = function (string $ngonNguAccount, array $query = []) {
        $session = WidgetSession::make();
        $session->account->update(['locale' => $ngonNguAccount]);
        config()->set('app.locale', $ngonNguAccount === 'vi' ? 'en' : 'vi');

        return [$session, route('widget', ['website_token' => $session->channel->website_token, ...$query])];
    };

    it('theo ngôn ngữ account chủ hộp thư khi trang nhúng không chọn', function () use ($moWidget) {
        foreach (['vi', 'en'] as $ngonNgu) {
            [, $url] = $moWidget($ngonNgu);

            expect(langCuaTrang($this->get($url)->assertOk()->getContent()))->toBe($ngonNgu);
        }
    });

    it('ngôn ngữ trang nhúng chọn qua SDK thắng ngôn ngữ account', function () use ($moWidget) {
        [, $url] = $moWidget('en', ['locale' => 'vi']);

        expect(langCuaTrang($this->get($url)->assertOk()->getContent()))->toBe('vi');
    });

    it('ngôn ngữ trang nhúng không hỗ trợ thì quay về ngôn ngữ account', function () use ($moWidget) {
        [, $url] = $moWidget('vi', ['locale' => 'xx']);

        expect(langCuaTrang($this->get($url)->assertOk()->getContent()))->toBe('vi');
    });

    it('không ghi cookie ngôn ngữ dùng chung với dashboard và landing', function () use ($moWidget) {
        [, $url] = $moWidget('en', ['locale' => 'vi']);

        $this->get($url)->assertOk()->assertCookieMissing('yona_locale');
    });

    it('không lấy ngôn ngữ của người dùng dashboard đang đăng nhập cùng trình duyệt', function () use ($moWidget) {
        [$session, $url] = $moWidget('vi');
        $user = nguoiDungCuaAccount($session->account, ['locale' => 'en']);

        $html = $this->actingAs($user)->withCookie('yona_locale', 'en')->get($url)->assertOk()->getContent();

        expect(langCuaTrang($html))->toBe('vi');
    });
});
