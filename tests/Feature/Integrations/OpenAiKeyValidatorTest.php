<?php

use App\Models\InstallationConfig;
use App\Services\Integrations\OpenAi\KeyValidator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

it('chấp nhận khoá OpenAI hợp lệ', function () {
    Http::fake(['https://api.openai.com/v1/models' => Http::response([], 200)]);

    expect(KeyValidator::isValid('sk-test-valid-key-123456789'))->toBeTrue();
});

it('từ chối khoá bị OpenAI báo không nhận diện được', function () {
    Http::fake(['https://api.openai.com/v1/models' => Http::response([], 401)]);

    expect(KeyValidator::isValid('sk-invalid'))->toBeFalse();
});

it('từ chối khoá rỗng mà không gọi mạng', function () {
    Http::fake();

    expect(KeyValidator::isValid(null))->toBeFalse()
        ->and(KeyValidator::isValid(''))->toBeFalse();

    Http::assertNothingSent();
});

it('coi lỗi máy chủ tạm thời là hợp lệ để không chặn việc lưu cài đặt', function () {
    Http::fake(['https://api.openai.com/v1/models' => Http::response([], 500)]);

    expect(KeyValidator::isValid('sk-test'))->toBeTrue();
});

it('coi lỗi kết nối tạm thời là hợp lệ để không chặn việc lưu cài đặt', function () {
    Http::fake(['https://api.openai.com/v1/models' => fn () => throw new ConnectionException('timeout')]);

    expect(KeyValidator::isValid('sk-test'))->toBeTrue();
});

it('gọi qua endpoint cấu hình CAPTAIN_OPEN_AI_ENDPOINT khi có', function () {
    InstallationConfig::create(['name' => 'CAPTAIN_OPEN_AI_ENDPOINT', 'value' => 'https://proxy.example.com/']);
    Http::fake(['https://proxy.example.com/v1/models' => Http::response([], 200)]);

    expect(KeyValidator::isValid('sk-test'))->toBeTrue();

    Http::assertSent(fn ($request) => $request->url() === 'https://proxy.example.com/v1/models');
    Http::assertNotSent(fn ($request) => $request->url() === 'https://api.openai.com/v1/models');
});

it('validate() trả câu lỗi khi api_key không hợp lệ', function () {
    Http::fake(['https://api.openai.com/v1/models' => Http::response([], 401)]);

    expect((new KeyValidator)->validate(['api_key' => 'sk-invalid']))->toBeString();
});

it('validate() trả null khi api_key hợp lệ', function () {
    Http::fake(['https://api.openai.com/v1/models' => Http::response([], 200)]);

    expect((new KeyValidator)->validate(['api_key' => 'sk-valid']))->toBeNull();
});
