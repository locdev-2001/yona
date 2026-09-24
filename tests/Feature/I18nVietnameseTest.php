<?php

use App\Http\Middleware\SetLocale;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Route;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;

/** Đọc mọi chuỗi của một locale thành mảng phẳng `FILE.key.con`. */
function flattenLocale(string $locale): array
{
    $flat = [];
    foreach (File::files(base_path("lang/$locale")) as $file) {
        $tree = require $file->getPathname();
        foreach (Arr::dot($tree) as $key => $value) {
            $flat[$file->getFilenameWithoutExtension().".$key"] = $value;
        }
    }

    return $flat;
}

/** Tên các tham số nội suy có trong chuỗi, cả kiểu `{name}` lẫn `:name`. */
function placeholdersOf(string $message): array
{
    preg_match_all('/\{(\w+)\}|:(\w+)/', $message, $matches);
    $names = array_values(array_filter(array_merge($matches[1], $matches[2])));
    sort($names);

    return array_values(array_unique($names));
}

it('có đủ file lang cho tiếng Việt, không thừa không thiếu', function () {
    $english = array_map(fn ($file) => $file->getFilename(), File::files(base_path('lang/en')));
    $vietnamese = array_map(fn ($file) => $file->getFilename(), File::files(base_path('lang/vi')));

    sort($english);
    sort($vietnamese);

    expect($vietnamese)->toBe($english);
});

it('phủ mọi key tiếng Anh, kể cả key lồng, và không thêm key lạ', function () {
    $english = flattenLocale('en');
    $vietnamese = flattenLocale('vi');

    expect(array_keys(array_diff_key($english, $vietnamese)))->toBe([])
        ->and(array_keys(array_diff_key($vietnamese, $english)))->toBe([]);
});

// Ký tự điều khiển (vd U+0008 lọt vào khi dịch) không hiện trên macOS nhưng
// trình duyệt Linux/Windows vẽ thành ô vuông giữa câu.
it('không có ký tự điều khiển trong chuỗi dịch', function (string $locale) {
    $withControlCharacters = array_keys(array_filter(
        flattenLocale($locale),
        fn ($message) => is_string($message) && preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $message) === 1,
    ));

    expect($withControlCharacters)->toBe([]);
})->with(['en', 'vi']);

it('giữ nguyên tham số nội suy của bản tiếng Anh', function () {
    $english = flattenLocale('en');
    $vietnamese = flattenLocale('vi');

    $mismatched = [];
    foreach ($english as $key => $message) {
        if (placeholdersOf($message) !== placeholdersOf($vietnamese[$key])) {
            $mismatched[] = $key;
        }
    }

    expect($mismatched)->toBe([]);
});

it('giữ nguyên thẻ HTML inline của bản tiếng Anh', function () {
    $english = flattenLocale('en');
    $vietnamese = flattenLocale('vi');

    $tagsOf = function (string $message): array {
        preg_match_all('/<\s*\/?\s*(\w+)/', $message, $matches);
        $tags = $matches[1];
        sort($tags);

        return $tags;
    };

    $mismatched = [];
    foreach ($english as $key => $message) {
        if ($tagsOf($message) !== $tagsOf($vietnamese[$key])) {
            $mismatched[] = $key;
        }
    }

    expect($mismatched)->toBe([]);
});

it('thực sự dịch sang tiếng Việt chứ không chép lại tiếng Anh', function () {
    $english = flattenLocale('en');
    $vietnamese = flattenLocale('vi');

    // Chuỗi được phép trùng: rỗng, thuần số/ký hiệu, hoặc danh từ riêng (Zalo, WhatsApp, Email…).
    $translatable = array_filter(
        $english,
        fn ($message, $key) => $message !== '' && preg_match('/\p{L}{4,}/u', $message) && $vietnamese[$key] === $message,
        ARRAY_FILTER_USE_BOTH,
    );

    // Ngưỡng: bản dịch vi gốc để nguyên một số thuật ngữ; chặn hồi quy dịch sót hàng loạt.
    expect(count($translatable))->toBeLessThan(count($english) * 0.05);
});

it('bundle frontend khớp lang/ cho cả hai locale', function () {
    $this->artisan('i18n:generate', ['--check' => true])->assertSuccessful();

    $bundle = File::get(resource_path('js/i18n/generated/index.ts'));
    expect($bundle)->toContain("'vi': vi");
});

it('__() trả chuỗi tiếng Việt khi app đổi locale', function () {
    app()->setLocale('vi');

    expect(__('conversation.REPLYBOX.PRIVATE_NOTE'))->toBe(require_vi_string('conversation', 'REPLYBOX.PRIVATE_NOTE'));

    app()->setLocale('en');
});

function require_vi_string(string $file, string $key): string
{
    return Arr::get(require base_path("lang/vi/$file.php"), $key);
}

it('chọn locale theo thứ tự: tham số route → query → người dùng → tài khoản', function () {
    $resolve = function (callable $prepare): string {
        $request = Request::create('/app');
        $prepare($request);
        app()->setLocale('en');
        (new SetLocale)->handle($request, fn () => new Response);

        return app()->getLocale();
    };

    $routeWithLocale = function (Request $request) {
        $route = new Route('GET', '/hc/{slug}/{locale}', []);
        $route->bind(Request::create('/hc/docs/vi'));
        $request->setRouteResolver(fn () => $route);
    };

    expect($resolve($routeWithLocale))->toBe('vi')
        ->and($resolve(fn (Request $request) => $request->query->set('locale', 'vi')))->toBe('vi')
        ->and($resolve(fn (Request $request) => $request->setUserResolver(fn () => new User(['ui_settings' => ['locale' => 'vi']]))))->toBe('vi')
        ->and($resolve(fn (Request $request) => $request->query->set('locale', 'kl')))->toBe('en');

    app()->setLocale('en');
});
