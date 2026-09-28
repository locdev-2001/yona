<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Sticker làm từ ảnh tải lên: `image_path` là WebP hiển thị trong Yona (động nếu
// nguồn động), `original_path` + `edit_params` đủ để dựng lại khi đổi cỡ.
// Chỉ số khung, thời lượng, dung lượng biết sau khi dựng nên để trống lúc chờ.
//
// Sticker Lottie cũ không có ảnh gốc: sticker đã dựng xong lấy ảnh tĩnh PNG sẵn
// có làm ảnh hiển thị; sticker chưa dựng xong không dựng tiếp được nữa nên thành
// hỏng. Tệp anim.json/poster.webp cũ nằm lại trong thư mục hash, janitor xoá cả
// thư mục khi sticker và tin không còn dùng.
return new class extends Migration
{
    private const STATUS_READY = 'ready';

    private const STATUS_FAILED = 'failed';

    private const LEGACY_FAILURE_CODE = 'unsupported_file_type';

    private const RENDER_METRIC_COLUMNS = ['frame_count', 'duration_ms', 'byte_size'];

    public function up(): void
    {
        Schema::table('stickers', function (Blueprint $table) {
            $table->string('image_path')->nullable();
            $table->string('original_path')->nullable();
            $table->jsonb('edit_params')->nullable();
            foreach (self::RENDER_METRIC_COLUMNS as $column) {
                $table->unsignedInteger($column)->nullable()->change();
            }
        });

        DB::table('stickers')
            ->where('status', self::STATUS_READY)
            ->whereNotNull('static_path')
            ->update(['image_path' => DB::raw('static_path'), 'frame_count' => 1, 'duration_ms' => 0]);

        DB::table('stickers')
            ->whereNull('image_path')
            ->update(['status' => self::STATUS_FAILED, 'failure_code' => self::LEGACY_FAILURE_CODE, 'static_path' => null]);

        Schema::table('stickers', function (Blueprint $table) {
            $table->dropColumn(['animation_path', 'poster_path']);
        });
    }

    // Không khôi phục được Lottie: sticker làm từ ảnh không có anim.json nên sau
    // khi quay lại chỉ còn ảnh tĩnh ở `static_path`.
    public function down(): void
    {
        Schema::table('stickers', function (Blueprint $table) {
            $table->string('animation_path')->nullable();
            $table->string('poster_path')->nullable();
        });

        foreach (self::RENDER_METRIC_COLUMNS as $column) {
            DB::table('stickers')->whereNull($column)->update([$column => 0]);
        }

        Schema::table('stickers', function (Blueprint $table) {
            foreach (self::RENDER_METRIC_COLUMNS as $column) {
                $table->unsignedInteger($column)->nullable(false)->change();
            }
            $table->dropColumn(['image_path', 'original_path', 'edit_params']);
        });
    }
};
