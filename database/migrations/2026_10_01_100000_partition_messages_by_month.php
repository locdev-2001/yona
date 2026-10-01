<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// Chia messages theo tháng (RANGE created_at). Khoá chính thành (id, created_at)
// nên ba bảng trỏ vào tin mang thêm message_created_at và khoá ngoại ghép.
// Index, khoá ngoại đi ra và quyền đọc chép nguyên từ bảng cũ (đọc từ catalog,
// không ghi cứng) để bản production có index tay vẫn giữ đủ.
// Tháng mới do `messages:create-partitions` tạo; tin ngoài mọi tháng vào DEFAULT.
return new class extends Migration
{
    private const MONTHS_AHEAD = 3;

    // bảng => [hành động khi xoá tin trước đây, cột message_id có NOT NULL]
    private const REFERENCING = [
        'csat_survey_responses' => ['CASCADE', true],
        'automation_rule_pending_executions' => ['SET NULL', false],
        'message_access_tokens' => ['CASCADE', true],
    ];

    public function up(): void
    {
        $this->guardUnexpectedDependencies();

        DB::statement('UPDATE messages SET created_at = COALESCE(updated_at, now()) WHERE created_at IS NULL');

        foreach (array_keys(self::REFERENCING) as $table) {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT {$table}_message_id_foreign");
            DB::statement("ALTER TABLE {$table} ADD COLUMN message_created_at timestamp(6) without time zone");
            DB::statement("UPDATE {$table} SET message_created_at = messages.created_at FROM messages WHERE messages.id = {$table}.message_id");
        }

        $definitions = $this->captureDefinitions();

        DB::statement('ALTER SEQUENCE messages_id_seq OWNED BY NONE');
        DB::statement('CREATE TABLE messages_partitioned (LIKE messages INCLUDING DEFAULTS) PARTITION BY RANGE (created_at)');
        DB::statement('ALTER TABLE messages_partitioned ALTER COLUMN created_at SET DEFAULT now(), ALTER COLUMN created_at SET NOT NULL');

        $this->createMonthlyPartitions();
        DB::statement('CREATE TABLE messages_default PARTITION OF messages_partitioned DEFAULT');

        DB::statement('INSERT INTO messages_partitioned SELECT * FROM messages');
        DB::statement('DROP TABLE messages');
        DB::statement('ALTER TABLE messages_partitioned RENAME TO messages');
        DB::statement('ALTER TABLE messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id, created_at)');

        $this->restoreDefinitions($definitions);

        foreach (self::REFERENCING as $table => [$onDelete, $required]) {
            if ($required) {
                DB::statement("ALTER TABLE {$table} ALTER COLUMN message_created_at SET NOT NULL");
            }

            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_message_id_foreign"
                .' FOREIGN KEY (message_id, message_created_at) REFERENCES messages (id, created_at)'
                ." ON UPDATE CASCADE ON DELETE {$onDelete}");
        }

        DB::statement('CREATE INDEX message_access_tokens_message_index ON message_access_tokens (message_id, message_created_at)');
        DB::statement('CREATE INDEX automation_rule_pending_executions_message_index ON automation_rule_pending_executions (message_id, message_created_at)');

        DB::statement('ANALYZE messages');
    }

    public function down(): void
    {
        foreach (array_keys(self::REFERENCING) as $table) {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT {$table}_message_id_foreign");
        }

        DB::statement('DROP INDEX IF EXISTS message_access_tokens_message_index');
        DB::statement('DROP INDEX IF EXISTS automation_rule_pending_executions_message_index');

        $definitions = $this->captureDefinitions();

        DB::statement('ALTER SEQUENCE messages_id_seq OWNED BY NONE');
        DB::statement('CREATE TABLE messages_plain (LIKE messages INCLUDING DEFAULTS)');
        DB::statement('ALTER TABLE messages_plain ALTER COLUMN created_at DROP DEFAULT, ALTER COLUMN created_at DROP NOT NULL');
        DB::statement('INSERT INTO messages_plain SELECT * FROM messages');
        DB::statement('DROP TABLE messages');
        DB::statement('ALTER TABLE messages_plain RENAME TO messages');
        DB::statement('ALTER TABLE messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id)');

        $this->restoreDefinitions($definitions);

        foreach (self::REFERENCING as $table => [$onDelete]) {
            DB::statement("ALTER TABLE {$table} DROP COLUMN message_created_at");
            DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_message_id_foreign"
                ." FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE {$onDelete}");
        }
    }

    // Khoá ngoại khác trỏ vào messages, unique index ngoài khoá chính hay trigger
    // tự viết thì cách chép ở dưới không đủ — dừng hẳn thay vì làm mất ràng buộc.
    private function guardUnexpectedDependencies(): void
    {
        $known = array_map(fn (string $table) => "{$table}_message_id_foreign", array_keys(self::REFERENCING));

        $foreign = collect(DB::select("SELECT conname FROM pg_constraint WHERE contype = 'f' AND confrelid = 'messages'::regclass"))
            ->pluck('conname')->diff($known);
        $unique = collect(DB::select("SELECT indexrelid::regclass::text AS name FROM pg_index WHERE indrelid = 'messages'::regclass AND indisunique AND NOT indisprimary"))
            ->pluck('name');
        $triggers = collect(DB::select("SELECT tgname FROM pg_trigger WHERE tgrelid = 'messages'::regclass AND NOT tgisinternal"))
            ->pluck('tgname');

        if ($foreign->isNotEmpty() || $unique->isNotEmpty() || $triggers->isNotEmpty()) {
            throw new RuntimeException('messages có phụ thuộc chưa xử lý: '.$foreign->merge($unique)->merge($triggers)->implode(', '));
        }
    }

    /** @return array{indexes: list<string>, foreignKeys: list<string>, grants: list<string>} */
    private function captureDefinitions(): array
    {
        $indexes = collect(DB::select(
            "SELECT indexdef FROM pg_indexes WHERE schemaname = current_schema() AND tablename = 'messages' AND indexname <> 'messages_pkey'"
        ))->map(fn (object $row) => preg_replace('/ ON (ONLY )?\S+ USING /', ' ON messages USING ', $row->indexdef, 1))->all();

        $foreignKeys = collect(DB::select(
            "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE contype = 'f' AND conrelid = 'messages'::regclass"
        ))->map(fn (object $row) => "ALTER TABLE messages ADD CONSTRAINT {$row->conname} {$row->def}")->all();

        $grants = collect(DB::select(
            "SELECT grantee, string_agg(privilege_type, ', ') AS privileges FROM information_schema.role_table_grants
             WHERE table_schema = current_schema() AND table_name = 'messages'
               AND grantee <> (SELECT tableowner FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'messages')
             GROUP BY grantee"
        ))->map(fn (object $row) => "GRANT {$row->privileges} ON messages TO ".($row->grantee === 'PUBLIC' ? 'PUBLIC' : '"'.$row->grantee.'"'))->all();

        return ['indexes' => $indexes, 'foreignKeys' => $foreignKeys, 'grants' => $grants];
    }

    /** @param array{indexes: list<string>, foreignKeys: list<string>, grants: list<string>} $definitions */
    private function restoreDefinitions(array $definitions): void
    {
        foreach ([...$definitions['indexes'], ...$definitions['foreignKeys'], ...$definitions['grants']] as $statement) {
            DB::statement($statement);
        }

        DB::statement('ALTER SEQUENCE messages_id_seq OWNED BY messages.id');
    }

    private function createMonthlyPartitions(): void
    {
        $oldest = DB::scalar('SELECT min(created_at) FROM messages');
        $month = ($oldest === null ? Carbon::now() : Carbon::parse($oldest))->startOfMonth();
        $last = Carbon::now()->startOfMonth()->addMonths(self::MONTHS_AHEAD);

        for (; $month->lte($last); $month = $month->copy()->addMonth()) {
            DB::statement(sprintf(
                "CREATE TABLE messages_p%s PARTITION OF messages_partitioned FOR VALUES FROM ('%s') TO ('%s')",
                $month->format('Y_m'),
                $month->toDateString(),
                $month->copy()->addMonth()->toDateString(),
            ));
        }
    }
};
