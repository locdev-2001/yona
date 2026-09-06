<?php

use App\Channels\Capability;
use App\Channels\CapabilitySet;
use App\Channels\DeclaresCapabilities;
use App\Models\Channel\TwilioSms;
use Illuminate\Database\Eloquent\Relations\Relation;

// Khung khai báo năng lực kênh — docs/channel-capabilities.md §3.
// Sổ đăng ký kênh DUY NHẤT là morph map (AppServiceProvider): thêm kênh mới mà
// quên khai năng lực thì test này đỏ ngay, không cần nhớ sửa danh sách nào khác.

const CAPABILITY_SNAPSHOT_PATH = 'tests/Contracts/Channels/capability-matrix.snapshot.json';

/** @return array<string, class-string> morph type => model kênh */
function channelMorphMap(): array
{
    return collect(Relation::morphMap())
        ->filter(fn (string $class, string $type) => str_starts_with($type, 'Channel::'))
        ->all();
}

/** Kênh có nhiều biến thể thì mỗi biến thể là một dòng snapshot riêng (§3: quyết lúc đọc model). */
function channelVariants(): array
{
    $variants = [];

    foreach (channelMorphMap() as $type => $class) {
        $variants[$type] = new $class;
    }

    $variants['Channel::TwilioSms (medium=whatsapp)'] = new TwilioSms(['medium' => 'whatsapp']);

    ksort($variants);

    return $variants;
}

it('mọi kênh trong morph map đều tự khai năng lực', function () {
    foreach (channelMorphMap() as $type => $class) {
        expect(new $class)->toBeInstanceOf(DeclaresCapabilities::class, "{$type} chưa implement DeclaresCapabilities");
    }
});

it('khai báo chỉ chứa năng lực hợp lệ, không trùng, đúng thứ tự enum', function () {
    foreach (channelVariants() as $type => $channel) {
        $values = $channel->capabilities()->values();

        expect($channel->capabilities())->toBeInstanceOf(CapabilitySet::class)
            ->and(array_diff($values, Capability::allValues()))->toBe([], "{$type} khai năng lực không có trong enum")
            ->and(array_unique($values))->toBe($values, "{$type} khai trùng năng lực")
            ->and($values)->toBe(
                array_values(array_intersect(Capability::allValues(), $values)),
                "{$type} trả năng lực sai thứ tự enum",
            );
    }
});

it('ma trận khai báo khớp snapshot đã chốt', function () {
    $current = [];

    foreach (channelVariants() as $type => $channel) {
        $current[$type] = $channel->capabilities()->values();
    }

    $path = base_path(CAPABILITY_SNAPSHOT_PATH);

    if (env('UPDATE_CAPABILITY_SNAPSHOT') === '1') {
        file_put_contents($path, json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
    }

    expect($current)->toBe(
        json_decode(file_get_contents($path), true),
        'Ma trận năng lực đổi. Nếu đổi có chủ đích: cập nhật docs/channel-capabilities.md §4 rồi chạy '
        .'UPDATE_CAPABILITY_SNAPSHOT=1 php artisan test tests/Contracts/Channels/CapabilityDeclarationTest.php',
    );
});

it('danh sách năng lực phía FE khớp enum PHP', function () {
    $source = file_get_contents(base_path('resources/js/shared/constants/channelCapabilities.ts'));
    preg_match('/CHANNEL_CAPABILITIES = \[(.*?)\] as const;/s', $source, $matches);
    preg_match_all("/'([a-z_]+)'/", $matches[1] ?? '', $values);

    expect($values[1])->toBe(Capability::allValues());
});
