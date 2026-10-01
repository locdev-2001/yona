<?php

use App\Channels\ChannelConnectionCatalog;

// Dải kênh trang chủ chỉ được hứa kênh mà màn "Thêm kênh" đang mở trên bản cài đặt
// mặc định (chưa có app Meta), kênh còn đóng chỉ được gọi là "sắp có".

function landingChannelKeys(string $constant): array
{
    $source = file_get_contents(resource_path('js/landing/components/sections/Channels.tsx'));

    preg_match('/export const '.$constant.' = \[(.*?)\] as const;/s', $source, $block);
    preg_match_all("/key: '([a-z_]+)'/", $block[1] ?? '', $keys);

    return $keys[1];
}

beforeEach(function () {
    config(['services.facebook.app_id' => null, 'services.facebook.app_secret' => null]);
});

it('kênh đang chạy trên trang chủ trùng đúng các lối vào đang mở', function () {
    $open = array_map(fn ($entry) => $entry->key, ChannelConnectionCatalog::available());

    expect(landingChannelKeys('LIVE_CHANNELS'))->toEqualCanonicalizing($open);
});

it('kênh "sắp có" trên trang chủ là lối vào có thật nhưng đang đóng', function () {
    $all = ChannelConnectionCatalog::all();

    foreach (landingChannelKeys('UPCOMING_CHANNELS') as $key) {
        expect($all)->toHaveKey($key);
        expect($all[$key]->available)->toBeFalse();
    }
});
