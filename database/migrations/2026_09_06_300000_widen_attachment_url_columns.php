<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Chatwoot khai `external_url`/`fallback_title` là string Rails = varchar
    // không giới hạn; giới hạn thật là validate 2048 ký tự (Limits::URL_LENGTH_LIMIT).
    // Migration A4 tạo varchar(255) nên URL dài bị DB chặn trước khi tới validate.
    public function up(): void
    {
        DB::statement('ALTER TABLE attachments ALTER COLUMN external_url TYPE varchar');
        DB::statement('ALTER TABLE attachments ALTER COLUMN fallback_title TYPE varchar');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE attachments ALTER COLUMN external_url TYPE varchar(255)');
        DB::statement('ALTER TABLE attachments ALTER COLUMN fallback_title TYPE varchar(255)');
    }
};
