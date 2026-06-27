<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P07 channel-zalo — Bảng zalo_connections (slot bridge per-tài-khoản Zalo cá nhân).
 *
 * connection_id: bigint UNIQUE cross-tenant, gán từ sequence zalo_connection_id_seq.
 * Bridge map slot qua connection_id — webhook resolver dùng pgsql_privileged để
 * lookup workspace_id từ connection_id (bypass RLS một lần duy nhất).
 *
 * Unique constraints:
 *   - connection_id UNIQUE (global)
 *   - (workspace_id, personal_uid) UNIQUE (một tài khoản Zalo / workspace)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zalo_connections', function (Blueprint $table) {
            $table->id(); // internal PK (uuid không cần vì cross-tenant lookup qua connection_id int)
            $table->uuid('workspace_id')->index();

            // Slot bridge — bigint UNIQUE cross-tenant, cấp qua nextval('zalo_connection_id_seq')
            $table->bigInteger('connection_id')->unique();

            $table->string('personal_uid', 64)->nullable();
            $table->string('display_name', 255)->nullable();
            $table->string('avatar_url', 2048)->nullable();

            // state: disconnected | qr_waiting | connected | session_lost
            $table->string('state', 32)->default('disconnected');
            $table->string('session_lost_reason', 512)->nullable();

            $table->timestamp('last_connected_at')->nullable();
            $table->timestamp('last_qr_at')->nullable();

            $table->unsignedBigInteger('lock_version')->default(0);

            $table->timestamps();
            $table->softDeletes();

            // Một workspace không thể có 2 kết nối cùng personal_uid
            $table->unique(['workspace_id', 'personal_uid']);

            // Query theo workspace + state (hiển thị danh sách kết nối)
            $table->index(['workspace_id', 'state']);
        });

        // ponytail: không dùng trigger — ZaloConnection::nextConnectionId() cấp connection_id
        // trước khi INSERT trong model. Trigger would require pgsql_privileged với search_path
        // phức tạp. Model method đủ đơn giản và testable.
    }

    public function down(): void
    {
        Schema::dropIfExists('zalo_connections');
    }
};
