<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Driver Zalo tra hồ sơ theo uid Zalo mỗi khi gặp một `source_id` chưa có
// contact_inbox — uid là khóa ổn định duy nhất của kênh, nhờ nó cùng một khách
// nhắn vào inbox thứ hai (hoặc inbox bị xóa rồi tạo lại) vẫn về đúng một hồ sơ.
// Không có index thì phép tra đó quét toàn bảng contacts của account.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("CREATE INDEX index_contacts_on_social_zalo_user_id ON contacts (account_id, (additional_attributes ->> 'social_zalo_user_id'))");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS index_contacts_on_social_zalo_user_id');
    }
};
