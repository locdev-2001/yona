<?php

declare(strict_types=1);

use App\Support\HelpCenter\PortalLinks;

it('vẽ icon danh mục thành SVG nhúng, nhận cả giá trị lưu kiểu cũ', function (string $value) {
    $html = PortalLinks::emojiOrIcon($value, '#3B82F6');

    expect($html)
        ->toStartWith('<svg ')
        ->toContain('style="color: #3B82F6;"')
        ->toContain('stroke="currentColor"')
        ->and($html)->toBe(PortalLinks::emojiOrIcon('rocket', '#3B82F6'));
})->with(['rocket', 'rocket-line', 'rocket-fill', 'i-ri-rocket-line']);

it('emoji chỉ được escape, tên icon lạ không vẽ gì', function () {
    expect(PortalLinks::emojiOrIcon('🚀'))->toBe('🚀')
        ->and(PortalLinks::emojiOrIcon('<b>'))->toBe('&lt;b&gt;')
        ->and(PortalLinks::emojiOrIcon('khong-co-icon'))->toBe('')
        ->and(PortalLinks::emojiOrIcon('rocket', 'red;x'))->not->toContain('style=');
});
