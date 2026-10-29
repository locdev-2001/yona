<?php

namespace App\Services\Admin\Operations\ChannelHealth;

// Sổ driver dò sức khoẻ kênh. Thứ tự là thứ tự ưu tiên: driver đầu tiên nhận
// hộp thư sẽ trả lời cho nó, driver chung về contract cấp quyền lại đứng cuối.
// Thêm loại kênh mới = thêm một driver vào đây, không sửa ChannelHealthInspector.
final class ChannelHealthDetectors
{
    /** @var list<class-string<ChannelProblemDetector>> */
    private const DETECTORS = [
        Detectors\ZaloSessionDetector::class,
        Detectors\MessengerPersonalSessionDetector::class,
        Detectors\ReauthorizationDetector::class,
    ];

    /** @var list<ChannelProblemDetector>|null */
    private ?array $resolved = null;

    /** @return list<ChannelProblemDetector> */
    public function all(): array
    {
        return $this->resolved ??= array_map(fn (string $detector) => app($detector), self::DETECTORS);
    }
}
