<?php

use App\Messaging\Structured\Choice;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\PayloadContext;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Conversation;
use App\Models\Message;

// Contract tin có cấu trúc: mỗi file trong fixtures/ là một loại tin, dùng chung
// với message kit phía frontend (resources/js/shared/messaging). Sửa hình dạng
// payload thì sửa fixture, và cả hai phía cùng đỏ tới khi khớp.

const MESSAGING_FIXTURES = __DIR__.'/fixtures';

function messagingFixtures(): array
{
    $fixtures = [];

    foreach (glob(MESSAGING_FIXTURES.'/*.json') as $path) {
        $fixture = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        $fixtures[$fixture['content_type']] = $fixture;
    }

    return $fixtures;
}

function outgoingContext(): PayloadContext
{
    return new PayloadContext(new Conversation, Message::TYPE_OUTGOING);
}

beforeEach(fn () => app()->setLocale('vi'));

it('mọi loại tin đăng ký đều có fixture, trừ loại cần dữ liệu thật', function () {
    // bank_transfer tra `PaymentAccount` thật theo account_id — không dựng được
    // với `new Conversation` rời như các fixture khác.
    $needsDatabase = ['order_request', 'bank_transfer'];

    expect(array_keys(messagingFixtures()))
        ->toEqualCanonicalizing(array_diff(app(StructuredTypeRegistry::class)->contentTypes(), $needsDatabase));
});

it('payload hợp lệ chuẩn hoá đúng, và chuẩn hoá lại dạng đã lưu cho ra chính nó', function () {
    $registry = app(StructuredTypeRegistry::class);

    foreach (messagingFixtures() as $contentType => $fixture) {
        foreach ($fixture['valid'] as $case) {
            $normalized = $registry->prepare($contentType, $case['content'], $case['attributes'], outgoingContext());

            expect($normalized)->toEqual($case['normalized'], "{$contentType}: {$case['name']}");
            expect($registry->prepare($contentType, $case['content'], $normalized, outgoingContext()))
                ->toEqual($normalized, "{$contentType}: {$case['name']} (idempotent)");
        }
    }
});

it('chữ thuần, dòng xem trước và lựa chọn khớp fixture', function () {
    $registry = app(StructuredTypeRegistry::class);

    foreach (messagingFixtures() as $contentType => $fixture) {
        $type = $registry->for($contentType);

        foreach ($fixture['valid'] as $case) {
            $label = "{$contentType}: {$case['name']}";

            expect($type->plainText($case['content'], $case['normalized']))->toBe($case['plain_text'], $label);
            expect($type->previewText($case['content'], $case['normalized']))->toBe($case['preview_text'], $label);
            expect(array_map(fn (Choice $choice) => [$choice->value, $choice->label], $type->choices($case['normalized'])))
                ->toBe($case['choices'], $label);
        }
    }
});

it('payload sai bị từ chối', function () {
    $registry = app(StructuredTypeRegistry::class);

    foreach (messagingFixtures() as $contentType => $fixture) {
        foreach ($fixture['invalid'] as $case) {
            try {
                $registry->prepare($contentType, $case['content'], $case['attributes'], outgoingContext());
                test()->fail("{$contentType}: \"{$case['name']}\" lẽ ra phải bị từ chối");
            } catch (InvalidStructuredPayload) {
                expect(true)->toBeTrue();
            }
        }
    }
});

it('giữ nguyên khoá không thuộc loại tin', function () {
    $normalized = app(StructuredTypeRegistry::class)->prepare('input_select', 'Hỏi', [
        'items' => [['title' => 'A']],
        'in_reply_to' => 42,
    ], outgoingContext());

    expect($normalized['in_reply_to'])->toBe(42);
});

it('loại tin chỉ gửi theo chiều đã khai', function () {
    expect(fn () => app(StructuredTypeRegistry::class)->prepare(
        'cards',
        null,
        ['items' => [['title' => 'A']]],
        new PayloadContext(new Conversation, Message::TYPE_INCOMING),
    ))->toThrow(InvalidStructuredPayload::class);
});
