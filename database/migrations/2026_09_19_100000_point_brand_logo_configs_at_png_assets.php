<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Bộ nhận diện mới chỉ có bản PNG nên `public/brand-assets/*.svg` đã bị xóa.
// Cài đặt nào đã lưu đường dẫn .svg vào installation_configs sẽ trỏ vào tệp
// không còn tồn tại — màn Super Admin và mọi nơi đọc giá trị đó hỏng ảnh.
// Chỉ đổi những bản ghi còn giữ nguyên mặc định cũ, giữ lại logo tự tải lên.
return new class extends Migration
{
    private const REPLACEMENTS = [
        'LOGO' => ['/brand-assets/logo.svg', '/brand-assets/logo.png'],
        'LOGO_DARK' => ['/brand-assets/logo_dark.svg', '/brand-assets/logo_dark.png'],
        'LOGO_THUMBNAIL' => ['/brand-assets/logo_thumbnail.svg', '/brand-assets/logo_thumbnail.png'],
    ];

    public function up(): void
    {
        $this->rewrite(fn (array $pair) => $pair);
    }

    public function down(): void
    {
        $this->rewrite(fn (array $pair) => array_reverse($pair));
    }

    private function rewrite(callable $direction): void
    {
        foreach (self::REPLACEMENTS as $name => $pair) {
            [$from, $to] = $direction($pair);

            DB::table('installation_configs')
                ->where('name', $name)
                ->where('serialized_value->value', $from)
                ->update([
                    'serialized_value' => json_encode(['value' => $to]),
                    'updated_at' => now(),
                ]);
        }
    }
};
