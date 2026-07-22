<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P07 channel-zalo — RLS cho bảng zalo_connections.
 *
 * Pattern từ enable_rls_on_leads.php (P07).
 * ws_isolation policy: mỗi tenant chỉ thấy connections của workspace mình.
 *
 * FORCE ROW LEVEL SECURITY: table owner (superuser) cũng bị policy chi phối
 * → phòng scope bleed khi pooled connection dùng pgsql_privileged để lookup
 * workspace_id (bypass 1 lần rồi bind trước khi đọc bằng user app).
 *
 * RlsPolicyCoverageTest (G4) whitelist: 'zalo_connections' phải có mặt.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'zalo_connections',
    ];

    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";

        foreach ($this->tables as $table) {
            $db->statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
            $db->statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
            $db->statement("DROP POLICY IF EXISTS ws_isolation ON {$table}");
            $db->statement("CREATE POLICY ws_isolation ON {$table} USING ({$predicate}) WITH CHECK ({$predicate})");
            $db->statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO yona_app");
        }
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');

        foreach ($this->tables as $table) {
            $db->statement("DROP POLICY IF EXISTS ws_isolation ON {$table}");
            $db->statement("ALTER TABLE {$table} NO FORCE ROW LEVEL SECURITY");
            $db->statement("ALTER TABLE {$table} DISABLE ROW LEVEL SECURITY");
        }
    }
};
