<?php

use Illuminate\Support\Facades\File;

function writeLangFile(string $langPath, string $locale, string $namespace, array $tree): void
{
    File::ensureDirectoryExists("$langPath/$locale");
    File::put("$langPath/$locale/$namespace.php", '<?php return '.var_export($tree, true).';');
}

beforeEach(function () {
    $this->langPath = storage_path('framework/testing/i18n-lang-'.uniqid());
    $this->outputPath = storage_path('framework/testing/i18n-out-'.uniqid());
    app()->useLangPath($this->langPath);
    config()->set('app.fallback_locale', 'en');
});

afterEach(function () {
    File::deleteDirectory($this->langPath);
    File::deleteDirectory($this->outputPath);
});

it('sinh bundle theo namespace UPPER từ tên file, chuỗi giữ nguyên văn', function () {
    writeLangFile($this->langPath, 'en', 'conversation', [
        'REPLYBOX' => ['PRIVATE_NOTE' => 'Private Note', 'GREETING' => 'Hi {name}, you have {count} items | {count} items'],
    ]);

    $this->artisan('i18n:generate', ['--output' => $this->outputPath])->assertSuccessful();

    $bundle = File::get("$this->outputPath/en.ts");
    expect($bundle)->toStartWith('// Sinh bởi `php artisan i18n:generate`')
        ->and($bundle)->toContain('"CONVERSATION": {')
        ->and($bundle)->toContain('"GREETING": "Hi {name}, you have {count} items | {count} items"');

    expect(File::get("$this->outputPath/index.ts"))
        ->toContain("import en from './en';")
        ->toContain("export const defaultLocale = 'en';");
});

it('lỗi rõ khi locale khác thiếu key so với locale gốc', function () {
    writeLangFile($this->langPath, 'en', 'login', ['TITLE' => 'Login', 'SUBMIT' => 'Submit']);
    writeLangFile($this->langPath, 'vi', 'login', ['TITLE' => 'Đăng nhập']);

    $this->artisan('i18n:generate', ['--output' => $this->outputPath])
        ->expectsOutputToContain('lang/vi thiếu key: LOGIN.SUBMIT')
        ->assertFailed();

    expect(File::exists("$this->outputPath/en.ts"))->toBeFalse();
});

it('lỗi rõ khi file lang không return array', function () {
    File::ensureDirectoryExists("$this->langPath/en");
    File::put("$this->langPath/en/broken.php", '<?php return "not an array";');

    $this->artisan('i18n:generate', ['--output' => $this->outputPath])
        ->expectsOutputToContain('phải return array')
        ->assertFailed();
});

it('--check báo lệch khi bundle cũ hơn lang', function () {
    writeLangFile($this->langPath, 'en', 'login', ['TITLE' => 'Login']);
    $this->artisan('i18n:generate', ['--output' => $this->outputPath])->assertSuccessful();
    $this->artisan('i18n:generate', ['--output' => $this->outputPath, '--check' => true])->assertSuccessful();

    writeLangFile($this->langPath, 'en', 'login', ['TITLE' => 'Sign in']);

    $this->artisan('i18n:generate', ['--output' => $this->outputPath, '--check' => true])
        ->expectsOutputToContain('lệch với lang/')
        ->assertFailed();
});

it('backend __() và bundle frontend đọc cùng một chuỗi với placeholder {name}', function () {
    writeLangFile($this->langPath, 'en', 'conversation', [
        'REPLYBOX' => ['HELLO' => 'Hello {name}, limit {size}MB', 'LEGACY' => 'Hello :name'],
    ]);
    app('translator')->setLoaded([]);

    $this->artisan('i18n:generate', ['--output' => $this->outputPath])->assertSuccessful();

    expect(__('conversation.REPLYBOX.HELLO', ['name' => 'Ada', 'size' => 5]))->toBe('Hello Ada, limit 5MB')
        ->and(__('conversation.REPLYBOX.LEGACY', ['name' => 'Ada']))->toBe('Hello Ada')
        ->and(File::get("$this->outputPath/en.ts"))->toContain('"HELLO": "Hello {name}, limit {size}MB"');
});
