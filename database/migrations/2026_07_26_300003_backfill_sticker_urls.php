<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Bù địa chỉ ảnh cho sticker đã lưu mà thiếu.
 *
 * Bridge tra địa chỉ qua API của nhà cung cấp và lần tra đó hỏng được; những tin
 * rơi vào lúc đó chỉ còn mã sticker, và giao diện hiện chữ "[Sticker]".
 *
 * Dạng địa chỉ lấy từ chính những tin bridge tra THÀNH CÔNG đang nằm trong bảng,
 * không phải đoán. Chỉ đụng hàng nào thiếu — hàng đã có địa chỉ giữ nguyên.
 */
return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        DB::connection('pgsql_privileged')->update(
            "UPDATE messages
             SET media_meta = jsonb_set(
                 media_meta,
                 '{sticker,url}',
                 to_jsonb('https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=' ||
                          (media_meta->'sticker'->>'id') || '&size=130')
             )
             WHERE type = 'sticker'
               AND media_meta->'sticker'->>'id' IS NOT NULL
               AND media_meta->'sticker'->>'url' IS NULL
               AND media_meta->'sticker'->>'thumbnail' IS NULL"
        );
    }

    public function down(): void
    {
        // Không gỡ: địa chỉ bù vào là đúng, gỡ ra chỉ làm mất hình lần nữa.
    }
};
