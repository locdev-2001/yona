<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Bí mật kênh phải nằm dạng mã hóa trong DB (bản gốc: `encrypts :bot_token`,
// `encrypts :line_channel_secret/:line_channel_token`). Telegram tra kênh bằng
// bot_token trong URL webhook nên thêm cột băm sha256 để tìm — thay cho
// deterministic encryption của Rails.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channel_telegram', function (Blueprint $table) {
            $table->string('bot_token_hash', 64)->nullable();
        });

        foreach (DB::table('channel_telegram')->select('id', 'bot_token')->get() as $row) {
            DB::table('channel_telegram')->where('id', $row->id)->update([
                'bot_token_hash' => hash('sha256', (string) $row->bot_token),
                'bot_token' => Crypt::encryptString((string) $row->bot_token),
            ]);
        }

        Schema::table('channel_telegram', function (Blueprint $table) {
            $table->dropUnique('channel_telegram_bot_token_unique');
            $table->unique('bot_token_hash');
        });

        foreach (DB::table('channel_line')->select('id', 'line_channel_secret', 'line_channel_token')->get() as $row) {
            DB::table('channel_line')->where('id', $row->id)->update([
                'line_channel_secret' => Crypt::encryptString((string) $row->line_channel_secret),
                'line_channel_token' => Crypt::encryptString((string) $row->line_channel_token),
            ]);
        }
    }

    public function down(): void
    {
        foreach (DB::table('channel_telegram')->select('id', 'bot_token')->get() as $row) {
            DB::table('channel_telegram')->where('id', $row->id)->update([
                'bot_token' => Crypt::decryptString((string) $row->bot_token),
            ]);
        }

        Schema::table('channel_telegram', function (Blueprint $table) {
            $table->dropUnique('channel_telegram_bot_token_hash_unique');
            $table->dropColumn('bot_token_hash');
            $table->unique('bot_token');
        });

        foreach (DB::table('channel_line')->select('id', 'line_channel_secret', 'line_channel_token')->get() as $row) {
            DB::table('channel_line')->where('id', $row->id)->update([
                'line_channel_secret' => Crypt::decryptString((string) $row->line_channel_secret),
                'line_channel_token' => Crypt::decryptString((string) $row->line_channel_token),
            ]);
        }
    }
};
