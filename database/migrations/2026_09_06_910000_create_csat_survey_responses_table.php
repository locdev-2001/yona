<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Port từ db/schema.rb Chatwoot v4.17.1 (bảng `csat_survey_responses`).
// Bỏ 3 cột chỉ có mã enterprise ghi vào (`csat_review_notes`,
// `review_notes_updated_at`, `review_notes_updated_by_id`) — quyết định #12.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('csat_survey_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            // Một tin khảo sát chỉ ứng với một phiếu trả lời — khách chấm lại thì
            // ghi đè chính phiếu đó (ResponseBuilder tìm theo message_id).
            $table->foreignId('message_id')->unique()->constrained()->cascadeOnDelete();
            $table->integer('rating');
            $table->text('feedback_message')->nullable();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);

            // Postgres không tự đánh index cho khóa ngoại; báo cáo CSAT (D2) lọc
            // theo đúng bốn cột này.
            $table->index('account_id');
            $table->index('conversation_id');
            $table->index('contact_id');
            $table->index('assigned_agent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('csat_survey_responses');
    }
};
