<?php

namespace Tests\Feature\Channels;

// Nạp payload webhook mẫu của nhà cung cấp.
class ChannelFixture
{
    /** @return array<string, mixed> */
    public static function load(string $name): array
    {
        return json_decode(file_get_contents(base_path("tests/Fixtures/channels/{$name}.json")), true);
    }

    /**
     * Ảnh JPEG thật (finfo nhận ra) kèm phần đệm để dựng tệp lớn tuỳ ý —
     * đường tải đính kèm lấy kiểu MIME từ chính nội dung nên fixture phải là
     * bytes thật chứ không phải chuỗi giả.
     */
    public static function jpegBytes(int $paddingBytes = 0): string
    {
        $image = imagecreatetruecolor(2, 2);

        ob_start();
        imagejpeg($image);
        $jpeg = (string) ob_get_clean();
        imagedestroy($image);

        return $jpeg.str_repeat("\0", max(0, $paddingBytes));
    }
}
