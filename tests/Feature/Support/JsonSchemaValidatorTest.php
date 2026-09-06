<?php

use App\Models\DashboardApp;
use App\Support\Integrations\JsonSchemaValidator;

// Thay cho gem JSONSchemer: chỉ cần đúng trên các lược đồ mà bản port khai.

it('kiểm lược đồ nội dung của dashboard app', function (mixed $content, bool $valid) {
    expect(JsonSchemaValidator::isValid($content, DashboardApp::CONTENT_SCHEMA))->toBe($valid);
})->with([
    'hợp lệ https' => [[['type' => 'frame', 'url' => 'https://link.com']], true],
    'hợp lệ http' => [[['type' => 'frame', 'url' => 'http://link.com']], true],
    'url không có giao thức' => [[['type' => 'frame', 'url' => 'com']], false],
    'giao thức ftp' => [[['type' => 'frame', 'url' => 'ftp://a.com/x']], false],
    'type lạ' => [[['type' => 'dda', 'url' => 'https://link.com']], false],
    'thiếu url' => [[['type' => 'frame']], false],
    'mảng rỗng' => [[], false],
    'không phải mảng' => [['type' => 'frame'], false],
]);

it('kiểm lược đồ settings của app trong danh mục', function () {
    $schema = config('integration.apps.openai.settings_json_schema');

    expect(JsonSchemaValidator::isValid(['api_key' => 'sk-x'], $schema))->toBeTrue()
        ->and(JsonSchemaValidator::isValid(['api_key' => 'sk-x', 'label_suggestion' => true], $schema))->toBeTrue()
        ->and(JsonSchemaValidator::isValid([], $schema))->toBeFalse()
        ->and(JsonSchemaValidator::isValid(['api_key' => 'sk-x', 'lạ' => 1], $schema))->toBeFalse()
        ->and(JsonSchemaValidator::isValid(['api_key' => 1], $schema))->toBeFalse();
});

it('kiểm lược đồ dialogflow: credentials phải là object', function () {
    $schema = config('integration.apps.dialogflow.settings_json_schema');

    expect(JsonSchemaValidator::isValid([
        'project_id' => 'p',
        'credentials' => ['type' => 'service_account'],
        'region' => 'global',
    ], $schema))->toBeTrue()
        ->and(JsonSchemaValidator::isValid(['project_id' => 'p'], $schema))->toBeFalse()
        ->and(JsonSchemaValidator::isValid(['project_id' => 'p', 'credentials' => 'chuỗi'], $schema))->toBeFalse();
});
