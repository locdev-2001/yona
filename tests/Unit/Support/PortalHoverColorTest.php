<?php

declare(strict_types=1);

use App\Support\HelpCenter\PortalLinks;

/**
 * Màu hover của portal lấy từ màu thương hiệu tenant tự chọn, nên có thể nhạt tới
 * mức không đọc được trên nền trắng. Các test dưới đây khoá ngưỡng tương phản.
 */
function contrastOnWhite(string $hex): float
{
    $hex = ltrim($hex, '#');
    $channel = static function (float $value): float {
        $normalized = $value / 255;

        return $normalized <= 0.03928
            ? $normalized / 12.92
            : (($normalized + 0.055) / 1.055) ** 2.4;
    };

    $luminance = 0.2126 * $channel((float) hexdec(substr($hex, 0, 2)))
        + 0.7152 * $channel((float) hexdec(substr($hex, 2, 2)))
        + 0.0722 * $channel((float) hexdec(substr($hex, 4, 2)));

    return 1.05 / ($luminance + 0.05);
}

it('kéo màu nhạt cho tới khi đọc được trên nền trắng', function (string $brandColor) {
    expect(contrastOnWhite(PortalLinks::hoverColor($brandColor)))->toBeGreaterThanOrEqual(3.1);
})->with([
    'vàng rất nhạt' => '#FFD700',
    'gần trắng' => '#F9F9F9',
    'trắng' => '#FFFFFF',
    'hex 3 ký tự' => '#abc',
]);

it('giữ nguyên màu đã đủ tương phản', function (string $brandColor) {
    expect(PortalLinks::hoverColor($brandColor))->toBe(strtolower($brandColor));
})->with([
    'cam' => '#ff5733',
    'xanh' => '#1f93ff',
    'đen' => '#000000',
]);

it('trả màu mực khi không đọc được màu tenant', function (string $invalid) {
    expect(PortalLinks::hoverColor($invalid))->toBe('#151718');
})->with([
    'chữ không phải hex' => 'xyz',
    'rỗng' => '',
    'thiếu ký tự' => '#12345',
    'ngoài bảng hex' => '#GGGGGG',
]);

it('luôn trả hex 6 ký tự hợp lệ', function () {
    foreach (['#FFD700', '#000000', 'xyz', '#abc'] as $input) {
        expect(PortalLinks::hoverColor($input))->toMatch('/\A#[0-9a-f]{6}\z/');
    }
});
