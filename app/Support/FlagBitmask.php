<?php

namespace App\Support;

// Thay cho gem FlagShihTzu của Chatwoot: một cột integer chứa nhiều cờ bật/tắt.
// Mọi phép bit sống ở đây; model chỉ nói chuyện bằng danh sách tên cờ.
final readonly class FlagBitmask
{
    /** @param array<int, string> $flags vị trí bit (đếm từ 1) => tên cờ */
    public function __construct(private array $flags) {}

    /** @return list<string> tên các cờ đang bật, theo thứ tự bit */
    public function toNames(int $bitmask): array
    {
        $names = [];

        foreach ($this->flags as $position => $name) {
            if (($bitmask & (1 << ($position - 1))) !== 0) {
                $names[] = $name;
            }
        }

        return $names;
    }

    /**
     * Bỏ qua giá trị rỗng: form của Chatwoot gửi `selected_feature_flags[]=''`
     * để diễn đạt "không bật cờ nào" (enable_flag if flag.present?).
     *
     * @param  iterable<mixed>|null  $names
     */
    public function toBitmask(?iterable $names): int
    {
        $positionsByName = array_flip($this->flags);
        $bitmask = 0;

        foreach ($names ?? [] as $name) {
            if (! is_string($name) || $name === '' || ! isset($positionsByName[$name])) {
                continue;
            }

            $bitmask |= 1 << ($positionsByName[$name] - 1);
        }

        return $bitmask;
    }
}
