<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Trước khi xoá tệp kho sticker, StickerFileJanitor hỏi còn sticker nào dùng
// cùng hash và còn đính kèm nào mượn tệp. Không có hai index này thì mỗi lần
// xoá bộ hay xoá account phải quét tuần tự cả bảng attachments của mọi tenant.
// CONCURRENTLY để không khoá ghi attachments khi deploy, nên không chạy trong
// transaction.
return new class extends Migration
{
    public $withinTransaction = false;

    private const INDEXES = [
        'index_attachments_on_sticker_path' => "attachments (path) WHERE disk = 'stickers'",
        'index_stickers_on_content_hash' => 'stickers (content_hash)',
    ];

    public function up(): void
    {
        foreach (self::INDEXES as $name => $definition) {
            $this->dropIfInvalid($name);
            DB::statement("CREATE INDEX CONCURRENTLY IF NOT EXISTS {$name} ON {$definition}");
        }
    }

    public function down(): void
    {
        foreach (array_keys(self::INDEXES) as $name) {
            DB::statement("DROP INDEX CONCURRENTLY IF EXISTS {$name}");
        }
    }

    // Lần build CONCURRENTLY trước chết giữa chừng để lại index INVALID, và
    // `IF NOT EXISTS` sẽ bỏ qua nó — phải xoá đi để dựng lại.
    private function dropIfInvalid(string $name): void
    {
        $invalid = DB::selectOne(
            'SELECT 1 AS invalid FROM pg_index JOIN pg_class ON pg_class.oid = pg_index.indexrelid'
            .' WHERE pg_class.relname = ? AND pg_class.relnamespace = current_schema()::regnamespace'
            .' AND NOT pg_index.indisvalid',
            [$name],
        );

        if ($invalid !== null) {
            DB::statement("DROP INDEX CONCURRENTLY IF EXISTS {$name}");
        }
    }
};
