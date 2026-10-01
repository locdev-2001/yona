<?php

use App\Channels\ChannelConnection;
use App\Channels\ChannelConnectionCatalog;
use App\Channels\ConnectionMethod;
use App\Channels\DeclaresConnection;
use Tests\Contracts\Channels\ChannelCatalog;

// Giao kèo kết nối (#160): mọi driver kênh khai đúng MỘT cách kết nối, khớp năng lực
// phiên nó khai; thêm kênh mà quên khai thì test này đỏ, màn "Thêm kênh" không phải sửa.

it('mọi kênh trong morph map đều tự khai cách kết nối', function () {
    foreach (ChannelCatalog::morphMap() as $type => $class) {
        expect(is_subclass_of($class, DeclaresConnection::class))->toBeTrue("{$type} chưa implement DeclaresConnection");

        $connection = $class::connection();

        expect($connection)->toBeInstanceOf(ChannelConnection::class)
            ->and($connection->method)->toBeInstanceOf(ConnectionMethod::class, "{$type} khai cách kết nối lạ")
            ->and($connection->key)->toMatch('/^[a-z_]+$/', "{$type} khai key sai dạng");
    }
});

it('kênh đang mở khai năng lực phiên khớp cách kết nối', function () {
    foreach (ChannelCatalog::morphMap() as $type => $class) {
        $connection = $class::connection();
        $capability = $connection->method->sessionCapability();

        if (! $connection->available || $capability === null) {
            continue;
        }

        expect((new $class)->capabilities()->has($capability))
            ->toBeTrue("{$type} kết nối kiểu {$connection->method->value} nhưng không khai {$capability->value}");
    }
});

it('các driver chung một lối vào khai cùng một cách kết nối', function () {
    $methods = [];

    foreach (ChannelConnectionCatalog::drivers() as $class) {
        $connection = $class::connection();
        $methods[$connection->key] ??= $connection->method;

        expect($connection->method)->toBe($methods[$connection->key], "{$class} lệch cách kết nối với lối vào {$connection->key}");
    }
});

it('lối vào con khai cách kết nối, key không trùng, lối OAuth có đường bắt đầu', function () {
    foreach (ChannelConnectionCatalog::all() as $entry) {
        $keys = array_map(fn (ChannelConnection $option) => $option->key, $entry->options);

        expect($keys)->toBe(array_values(array_unique($keys)), "lối vào {$entry->key} có lựa chọn trùng key");

        foreach ($entry->options as $option) {
            expect($option->method)->toBeInstanceOf(ConnectionMethod::class);

            if ($option->method === ConnectionMethod::OauthRedirect) {
                expect($option->startRoute)->not->toBeNull("lựa chọn {$entry->key}.{$option->key} thiếu route bắt đầu OAuth");
            }
        }
    }
});
