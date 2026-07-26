<?php

use App\Modules\Chat\Delivery\Event\Action;
use App\Modules\Chat\Delivery\Event\ActionsEvent;
use App\Modules\Chat\Delivery\Event\CardEvent;
use App\Modules\Chat\Delivery\Event\OpaqueEvent;
use App\Modules\Chat\Delivery\Event\OutboundEvent;
use App\Modules\Chat\Delivery\Event\OutboundEventType;
use App\Modules\Chat\Delivery\Event\TextEvent;
use App\Modules\Chat\Delivery\OutboundMessage;
use App\Modules\Chat\Intake\InboundEvent;
use App\Modules\Chat\Intake\InboundEventType;

/**
 * §0.6 — mỗi gốc trừu tượng đi kèm MỘT enum định danh, đối xứng hai chiều.
 *
 * Bộ test này chặn cây sự kiện trôi dạt: thêm một lớp con mà quên thêm case
 * enum (hoặc ngược lại) là đỏ ngay, thay vì phát hiện lúc dữ liệu đã lưu sai.
 */
function symLoadClasses(string $dir, string $namespace, string $base): array
{
    $found = [];
    foreach (glob($dir.'/*.php') ?: [] as $file) {
        $class = $namespace.'\\'.basename($file, '.php');
        if (class_exists($class) && is_subclass_of($class, $base)) {
            $found[] = $class;
        }
    }

    return $found;
}

it('mỗi case OutboundEventType có đúng một lớp con và ngược lại', function () {
    $classes = symLoadClasses(
        app_path('Modules/Chat/Delivery/Event'),
        'App\\Modules\\Chat\\Delivery\\Event',
        OutboundEvent::class,
    );

    expect($classes)->not->toBeEmpty();

    $covered = [];
    foreach ($classes as $class) {
        $instance = (new ReflectionClass($class))->newInstanceWithoutConstructor();
        $covered[] = $instance->type();
    }

    expect($covered)->toEqualCanonicalizing(OutboundEventType::cases());
});

it('mỗi case InboundEventType có đúng một lớp con và ngược lại', function () {
    $classes = symLoadClasses(
        app_path('Modules/Chat/Intake/Event'),
        'App\\Modules\\Chat\\Intake\\Event',
        InboundEvent::class,
    );

    expect($classes)->not->toBeEmpty();

    $covered = [];
    foreach ($classes as $class) {
        $instance = (new ReflectionClass($class))->newInstanceWithoutConstructor();
        $covered[] = $instance->type();
    }

    expect($covered)->toEqualCanonicalizing(InboundEventType::cases());
});

it('sự kiện loại lạ đi qua hệ thống KHÔNG bị vứt', function () {
    $raw = ['type' => 'ket_qua_khao_sat_2027', 'payload' => ['diem' => 9]];

    $event = OutboundEvent::fromArray($raw);

    expect($event)->toBeInstanceOf(OpaqueEvent::class);
    expect($event->type())->toBe(OutboundEventType::Opaque);
    expect($event->toArray())->toBe($raw);
});

it('dựng lại từ mảng giữ nguyên nội dung thẻ và nút', function () {
    $original = [
        ['type' => 'text', 'text' => 'Phòng còn trống ạ'],
        ['type' => 'card', 'title' => 'Deluxe', 'image_url' => 'https://x/y.jpg', 'actions' => [
            ['id' => 'book', 'label' => 'Đặt ngay'],
        ]],
        ['type' => 'actions', 'actions' => [['id' => 'price', 'label' => 'Bảng giá']]],
    ];

    $events = OutboundEvent::listFromArray($original);

    expect($events)->toHaveCount(3);
    expect($events[1])->toBeInstanceOf(CardEvent::class);
    expect($events[2])->toBeInstanceOf(ActionsEvent::class);
    expect(OutboundEvent::listToArray($events))->toBe($original);
});

it('OutboundMessage::events rút được bản chữ thuần cho kênh chỉ hiểu chữ', function () {
    $message = OutboundMessage::events([
        new TextEvent('Phòng còn trống ạ'),
        new CardEvent(title: 'Deluxe', subtitle: '1.2 triệu/đêm'),
        new ActionsEvent([new Action('price', 'Bảng giá'), new Action('addr', 'Địa chỉ')]),
    ]);

    // Đây CHÍNH LÀ bản hạ cấp mà Zalo nhận: nó không có nút bấm, nhưng khách
    // vẫn đọc được nội dung thay vì nhận tin rỗng.
    expect($message->text)->toBe("Phòng còn trống ạ\nDeluxe — 1.2 triệu/đêm\nBảng giá · Địa chỉ");
    expect($message->isEmpty())->toBeFalse();
});

it('OutboundMessage::text vẫn dựng đúng một sự kiện chữ — không phá call-site cũ', function () {
    $message = OutboundMessage::text('xin chào');

    expect($message->text)->toBe('xin chào');
    expect($message->events)->toHaveCount(1);
    expect($message->events[0])->toBeInstanceOf(TextEvent::class);
    expect($message->toArray()['text'])->toBe('xin chào');
});
