<?php

use App\Translation\Translator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\File;

$placeholder = '{'.Translator::INSTALLATION_NAME_PARAM.'}';

it('mọi khoá của mọi file lang qua __() không còn chỗ trống tên cài đặt', function (string $locale) use ($placeholder) {
    $leaked = [];
    foreach (File::files(base_path("lang/$locale")) as $file) {
        $namespace = $file->getFilenameWithoutExtension();
        foreach (array_keys(Arr::dot(require $file->getPathname())) as $key) {
            $message = __("$namespace.$key", [], $locale);
            if (is_string($message) && str_contains($message, $placeholder)) {
                $leaked[] = "$namespace.$key";
            }
        }
    }

    expect($leaked)->toBe([]);
})->with(['en', 'vi']);

it('điền tên cài đặt từ cấu hình', function () {
    config(['yona.branding.installation_name' => 'Acme Chat']);

    expect(__('login.TITLE', [], 'vi'))->toBe('Đăng nhập Acme Chat')
        ->and(__('login.TITLE', [], 'en'))->toBe('Login to Acme Chat');
});

it('điền cả chuỗi lấy ra dưới dạng mảng', function () {
    config(['yona.branding.installation_name' => 'Acme Chat']);

    expect(__('integration_apps.webhooks', [], 'en')['description'])->toContain('Acme Chat')
        ->not->toContain('{'.Translator::INSTALLATION_NAME_PARAM.'}');
});

it('tham số truyền tay thắng tên cài đặt', function () {
    config(['yona.branding.installation_name' => 'Acme Chat']);

    expect(__('login.TITLE', [Translator::INSTALLATION_NAME_PARAM => 'Z'], 'en'))->toBe('Login to Z');
});

it('placeholder khác vẫn nội suy như cũ', function () {
    expect(__('app_global.PLACEHOLDER.TITLE_NAMED', ['name' => 'Báo cáo'], 'en'))->toBe('Báo cáo is not ready yet');
});
