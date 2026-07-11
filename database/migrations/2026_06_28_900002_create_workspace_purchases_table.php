<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// RLS-scoped: workspace_purchases theo workspace — tenant mua gói.
// lock_version cho optimistic locking khi update status (admin grant/cancel).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_purchases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->uuid('item_id');
            $table->string('status')->default('active'); // active | cancelled | expired
            $table->integer('quantity')->default(1);
            $table->string('external_ref')->nullable(); // payment ref (VNPay/MoMo GĐ2+)
            $table->timestampTz('current_period_start')->nullable();
            $table->timestampTz('current_period_end')->nullable();
            $table->integer('lock_version')->default(0);
            $table->timestamps();

            $table->index(['workspace_id', 'status']);
            $table->index('item_id');
        });

        // FK tới marketplace_items (global, không RLS).
        // Dùng default connection (superuser) — bảng tạo bởi superuser nên có quyền ALTER.
        DB::statement(
            'ALTER TABLE workspace_purchases ADD CONSTRAINT workspace_purchases_item_id_fkey
             FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE RESTRICT'
        );

        // RLS: workspace isolation
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";
        DB::statement('ALTER TABLE workspace_purchases ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE workspace_purchases FORCE ROW LEVEL SECURITY');
        DB::statement('DROP POLICY IF EXISTS ws_isolation ON workspace_purchases');
        DB::statement("CREATE POLICY ws_isolation ON workspace_purchases USING ({$predicate}) WITH CHECK ({$predicate})");
        DB::statement('GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_purchases TO crm_app');
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_purchases');
    }
};
