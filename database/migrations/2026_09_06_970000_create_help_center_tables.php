<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Port các bảng Help Center của Chatwoot: portals, portals_members, categories,
// related_categories, articles (db/schema.rb).
// Bỏ `folders` (bảng còn trong schema gốc nhưng không có controller/UI nào dùng)
// và `article_embeddings` (Captain — enterprise).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('custom_domain')->nullable()->unique();
            $table->string('color')->nullable();
            $table->string('homepage_link')->nullable();
            $table->string('page_title')->nullable();
            $table->text('header_text')->nullable();
            $table->jsonb('config')->default(json_encode(['allowed_locales' => ['en']]));
            $table->boolean('archived')->default(false);
            $table->unsignedBigInteger('channel_web_widget_id')->nullable();
            $table->jsonb('ssl_settings')->default('{}');
            $table->timestamps(6);

            $table->index('account_id');
            $table->index('channel_web_widget_id');
        });

        // portals_members của Chatwoot: bảng nối không id.
        Schema::create('portal_members', function (Blueprint $table) {
            $table->foreignId('portal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->unique(['portal_id', 'user_id']);
            $table->index('user_id');
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('portal_id')->constrained()->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->integer('position')->nullable();
            $table->string('locale')->default('en');
            $table->string('slug');
            $table->unsignedBigInteger('parent_category_id')->nullable();
            $table->unsignedBigInteger('associated_category_id')->nullable();
            $table->string('icon')->default('');
            $table->string('icon_color')->default('');
            $table->timestamps(6);

            $table->unique(['slug', 'locale', 'portal_id']);
            $table->index('locale');
            $table->index(['locale', 'account_id']);
            $table->index('parent_category_id');
            $table->index('associated_category_id');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->foreign('parent_category_id')->references('id')->on('categories')->nullOnDelete();
            $table->foreign('associated_category_id')->references('id')->on('categories')->nullOnDelete();
        });

        Schema::create('related_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->foreignId('related_category_id')->constrained('categories')->cascadeOnDelete();
            $table->timestamps(6);

            $table->unique(['category_id', 'related_category_id']);
            $table->unique(['related_category_id', 'category_id']);
        });

        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('portal_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->text('content')->nullable();
            $table->integer('status')->nullable();
            $table->integer('views')->nullable();
            $table->unsignedBigInteger('author_id')->nullable();
            $table->unsignedBigInteger('associated_article_id')->nullable();
            $table->jsonb('meta')->default('{}');
            $table->string('slug')->unique();
            $table->integer('position')->nullable();
            $table->string('locale')->default('en');
            $table->string('draft_title')->nullable();
            $table->text('draft_content')->nullable();
            $table->timestamps(6);

            $table->index('account_id');
            $table->index('author_id');
            $table->index('associated_article_id');
            $table->index('status');
            $table->index('views');

            $table->foreign('category_id')->references('id')->on('categories')->nullOnDelete();
            $table->foreign('author_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('associated_article_id')->references('id')->on('articles')->nullOnDelete();
        });

        // pg_search_scope :text_search — title(A) description(B) content(C).
        DB::statement(<<<'SQL'
            CREATE INDEX articles_text_search_index ON articles USING gin ((
                setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
                setweight(to_tsvector('simple', coalesce(content, '')), 'C')
            ))
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
        Schema::dropIfExists('related_categories');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('portal_members');
        Schema::dropIfExists('portals');
    }
};
