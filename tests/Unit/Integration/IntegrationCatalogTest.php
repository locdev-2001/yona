<?php

use App\Http\ViewModels\IntegrationCatalog;
use App\Modules\Chat\Adapter\Widget\WidgetChannelDriver;
use Tests\TestCase;

uses(TestCase::class);

/**
 * Trang tích hợp hỏi sổ đăng ký chứ không mang sẵn danh sách kênh.
 *
 * Vì vậy test cũng không được khẳng định "đúng một card": số card bằng số kênh
 * trong bản dựng, và thêm kênh là card tự hiện — đó chính là điều cần đúng.
 */
function catalogCard(string $key): ?array
{
    return collect(app(IntegrationCatalog::class)->cards())->firstWhere('key', $key);
}

it('mỗi kênh trong bản dựng có đúng một card', function () {
    $keys = array_column(app(IntegrationCatalog::class)->cards(), 'key');

    expect($keys)->toContain('zalo_personal')
        ->and($keys)->toContain(WidgetChannelDriver::KEY)
        ->and(count($keys))->toBe(count(array_unique($keys)));
});

it('card lấy nhãn và nhóm từ descriptor của kênh', function () {
    $card = catalogCard('zalo_personal');

    expect($card['name'])->toBe('Zalo cá nhân')
        ->and($card['category'])->toBe('chat');
});

it('logo của mỗi card tồn tại trong public assets', function () {
    foreach (app(IntegrationCatalog::class)->cards() as $card) {
        expect(public_path(ltrim($card['logo'], '/')))->toBeFile();
    }
});

it('cổng config bật thì enabled=true', function () {
    config(['integrations.zalo_personal.enabled' => true]);

    expect(catalogCard('zalo_personal')['enabled'])->toBeTrue();
});

it('cổng config tắt thì card VẪN còn, chỉ enabled=false', function () {
    config(['integrations.zalo_personal.enabled' => false]);

    // Biến mất khỏi trang thì người dùng mất luôn đường bật lại — trang này
    // chính là chỗ để bật.
    expect(catalogCard('zalo_personal'))->not->toBeNull()
        ->and(catalogCard('zalo_personal')['enabled'])->toBeFalse();
});

it('kênh nội bộ không có cổng config nên luôn bật', function () {
    expect(catalogCard(WidgetChannelDriver::KEY)['enabled'])->toBeTrue()
        ->and(catalogCard(WidgetChannelDriver::KEY)['href'])->toBeNull();
});

it('chưa có tài khoản kênh nào đang kết nối thì connected=false', function () {
    expect(catalogCard('zalo_personal')['connected'])->toBeFalse();
});
