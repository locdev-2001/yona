<?php

namespace App\Models;

use App\Models\Concerns\SelfValidating;
use App\Services\HelpCenter\SlugGenerator;
use Database\Factories\ArticleFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/models/article.rb (PgSearch → tsvector có trọng số).
// Bỏ LlmFormattable/article_embeddings (Captain — enterprise).
class Article extends Model
{
    /** @use HasFactory<ArticleFactory> */
    use HasFactory, SelfValidating;

    public const STATUS_DRAFT = 0;

    public const STATUS_PUBLISHED = 1;

    public const STATUS_ARCHIVED = 2;

    /** @var array<string, int> */
    public const STATUSES = [
        'draft' => self::STATUS_DRAFT,
        'published' => self::STATUS_PUBLISHED,
        'archived' => self::STATUS_ARCHIVED,
    ];

    /** @var list<string> Slug đụng route help center (/hc/:slug/:locale/search). */
    public const RESERVED_SLUGS = ['search', 'articles', 'categories'];

    // setweight: title A, description B, content C — đúng trọng số của pg_search_scope.
    public const SEARCH_VECTOR = "setweight(to_tsvector('simple', coalesce(articles.title, '')), 'A') || "
        ."setweight(to_tsvector('simple', coalesce(articles.description, '')), 'B') || "
        ."setweight(to_tsvector('simple', coalesce(articles.content, '')), 'C')";

    protected $fillable = [
        'account_id', 'portal_id', 'category_id', 'title', 'description', 'content', 'status', 'views',
        'author_id', 'associated_article_id', 'meta', 'slug', 'position', 'locale', 'draft_title', 'draft_content',
    ];

    protected $attributes = [
        'meta' => '{}',
        'locale' => 'en',
    ];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    protected static function booted(): void
    {
        static::saving(function (Article $article) {
            $article->ensureAccountId();
            $article->ensureLocale();
            $article->ensureSlug();
        });

        static::creating(function (Article $article) {
            if ($article->position === null) {
                $article->position = $article->nextPositionInCategory();
            }
        });

        // Bản gốc dùng after_save nhưng nhánh tạo mới luôn bị guard bỏ qua
        // (position đã do before_create đặt), nên chỉ cần bắt lần cập nhật.
        static::updated(function (Article $article) {
            $article->syncPositionOnCategoryChange();
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function portal(): BelongsTo
    {
        return $this->belongsTo(Portal::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function rootArticle(): BelongsTo
    {
        return $this->belongsTo(self::class, 'associated_article_id');
    }

    public function associatedArticles(): HasMany
    {
        return $this->hasMany(self::class, 'associated_article_id');
    }

    // enum status: cột số, API nói chuỗi.
    protected function status(): Attribute
    {
        return Attribute::make(
            get: fn (?int $value) => $value === null ? null : (array_flip(self::STATUSES)[$value] ?? null),
            set: fn (mixed $value) => self::statusValue($value),
        );
    }

    public static function statusValue(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value) || (is_string($value) && is_numeric($value))) {
            return (int) $value;
        }

        return self::STATUSES[(string) $value] ?? null;
    }

    public function isPublished(): bool
    {
        return $this->rawStatus() === self::STATUS_PUBLISHED;
    }

    public function rawStatus(): ?int
    {
        $value = $this->getAttributes()['status'] ?? null;

        return $value === null ? null : (int) $value;
    }

    /** @return Builder<static> */
    public static function forPortal(Portal $portal): Builder
    {
        return self::query()->where('articles.portal_id', $portal->id);
    }

    /** @param Builder<static> $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('articles.status', self::STATUS_PUBLISHED);
    }

    /** @param Builder<static> $query */
    public function scopeDraft(Builder $query): void
    {
        $query->where('articles.status', self::STATUS_DRAFT);
    }

    /** @param Builder<static> $query */
    public function scopeArchived(Builder $query): void
    {
        $query->where('articles.status', self::STATUS_ARCHIVED);
    }

    /** @param Builder<static> $query */
    public function scopeSearchByAuthor(Builder $query, mixed $authorId): void
    {
        if ((string) $authorId !== '') {
            $query->where('articles.author_id', (int) $authorId);
        }
    }

    /**
     * Article.search — left join category, lọc theo category_slug/locale/author/status,
     * rồi xếp hạng theo full-text nếu có query.
     *
     * @param  Builder<static>  $query
     * @param  array<string, mixed>  $params
     * @return Builder<static>
     */
    public static function search(Builder $query, array $params): Builder
    {
        $query->select('articles.*')->leftJoin('categories', 'categories.id', '=', 'articles.category_id');

        if ((string) ($params['category_slug'] ?? '') !== '') {
            $query->where('categories.slug', $params['category_slug']);
        }

        if ((string) ($params['locale'] ?? '') !== '') {
            $query->where('articles.locale', $params['locale']);
        }

        $query->searchByAuthor($params['author_id'] ?? null);

        if ((string) ($params['status'] ?? '') !== '') {
            $query->where('articles.status', self::statusValue($params['status']));
        }

        if ((string) ($params['query'] ?? '') !== '') {
            self::applyTextSearch($query, (string) $params['query']);
        }

        return $query;
    }

    /** @param Builder<static> $query */
    private static function applyTextSearch(Builder $query, string $term): void
    {
        $tsquery = self::toTsQuery($term);

        if ($tsquery === '') {
            // Không còn từ khoá dùng được: bản gốc cũng không trả bản ghi nào.
            $query->whereRaw('1 = 0');

            return;
        }

        $vector = self::SEARCH_VECTOR;

        $query->whereRaw("({$vector}) @@ to_tsquery('simple', ?)", [$tsquery])
            // normalization 2 = chia hạng cho log(độ dài) để bài dài không thắng nhờ dài.
            ->orderByRaw("ts_rank(({$vector}), to_tsquery('simple', ?), 2) DESC", [$tsquery]);
    }

    // pg_search prefix: true — mỗi từ khoá thành `từ:*`, nối bằng AND.
    public static function toTsQuery(string $term): string
    {
        $words = preg_split('/\s+/u', trim($term)) ?: [];

        $sanitized = [];
        foreach ($words as $word) {
            $word = preg_replace('/[^\p{L}\p{N}_-]+/u', '', $word) ?? '';

            if ($word !== '') {
                $sanitized[] = $word.':*';
            }
        }

        return implode(' & ', $sanitized);
    }

    /** @return list<string> */
    public function validationMessages(): array
    {
        $this->ensureAccountId();
        $this->ensureLocale();
        $this->ensureSlug();

        $messages = [];

        if ($this->account_id === null) {
            $messages[] = "Account can't be blank";
        }

        if ($this->author_id === null) {
            $messages[] = "Author can't be blank";
        }

        if ((string) $this->title === '') {
            $messages[] = "Title can't be blank";
        }

        if ($this->isPublished() && (string) $this->content === '') {
            $messages[] = "Content can't be blank";
        }

        if (in_array((string) $this->slug, self::RESERVED_SLUGS, true)) {
            $messages[] = 'Slug is reserved';
        }

        return [...$messages, ...$this->lengthMessages([
            'title' => 255, 'slug' => 255, 'locale' => 255, 'draft_title' => 255,
            'description' => 20000, 'content' => 20000, 'draft_content' => 20000,
        ])];
    }

    // associate_root_article: luôn trỏ về bài gốc để không lồng nhiều tầng.
    public function associateRootArticle(mixed $associatedArticleId): void
    {
        if ((string) $associatedArticleId === '') {
            return;
        }

        $article = $this->portal->articles()->whereKey((int) $associatedArticleId)->first();

        if ($article === null) {
            return;
        }

        $this->update(['associated_article_id' => $article->associated_article_id ?? $article->id]);
    }

    public function incrementViewCount(): void
    {
        $views = ($this->views ?? 0) + 1;
        $this->newQuery()->whereKey($this->id)->update(['views' => $views]);
        $this->setAttribute('views', $views);
        $this->syncOriginalAttribute('views');
    }

    /**
     * Article.update_positions — áp vị trí mới rồi giãn lại các category bị đụng.
     *
     * @param  array<int|string, int|string>  $positions
     * @return array<int, int> vị trí cuối cùng của những bài đã bị giãn
     */
    public static function updatePositions(Portal $portal, array $positions): array
    {
        if ($positions === []) {
            return [];
        }

        $movedIds = array_map('intval', array_keys($positions));

        return DB::transaction(function () use ($portal, $positions, $movedIds) {
            foreach ($positions as $articleId => $position) {
                $portal->articles()->whereKey((int) $articleId)->firstOrFail()->update(['position' => (int) $position]);
            }

            return self::rebalancePositions($portal, $movedIds);
        });
    }

    /**
     * @param  list<int>  $movedIds
     * @return array<int, int>
     */
    private static function rebalancePositions(Portal $portal, array $movedIds): array
    {
        $categoryIds = $portal->articles()->whereIn('id', $movedIds)->whereNotNull('category_id')
            ->distinct()->pluck('category_id')->all();

        $positions = [];

        foreach ($categoryIds as $categoryId) {
            self::resequenceCategory($portal, (int) $categoryId, $movedIds, $positions);
        }

        return $positions;
    }

    /** @param array<int, int> $positions */
    private static function resequenceCategory(Portal $portal, int $categoryId, array $movedIds, array &$positions): void
    {
        $ordered = $portal->articles()->where('category_id', $categoryId)->get()
            ->sortBy(fn (Article $article) => [
                $article->position ?? 0,
                in_array($article->id, $movedIds, true) ? 1 : 0,
                $article->id,
            ])
            ->values();

        if ($ordered->count() < 2) {
            return;
        }

        foreach ($ordered as $index => $article) {
            $newPosition = ($index + 1) * 10;
            $positions[$article->id] = $newPosition;

            if ($article->position !== $newPosition) {
                $article->newQuery()->whereKey($article->id)->update(['position' => $newPosition]);
            }
        }
    }

    private function ensureAccountId(): void
    {
        $this->account_id = $this->portal?->account_id ?? $this->account_id;
    }

    private function ensureLocale(): void
    {
        $category = $this->category;

        if ($category !== null) {
            $this->locale = $category->locale;

            return;
        }

        if ((string) $this->locale === '') {
            $this->locale = $this->portal?->defaultLocale() ?? 'en';
        }
    }

    // Người dùng không điền slug: sinh từ tiêu đề, duy nhất toàn hệ thống.
    private function ensureSlug(): void
    {
        if ((string) $this->slug !== '') {
            return;
        }

        $this->slug = SlugGenerator::unique(
            $this->title,
            fn (string $candidate) => self::query()->where('slug', $candidate)->whereKeyNot($this->id ?? 0)->exists(),
            self::RESERVED_SLUGS,
        );
    }

    private function nextPositionInCategory(): int
    {
        $max = self::query()
            ->where('category_id', $this->category_id)
            ->where('account_id', $this->account_id)
            ->max('position');

        return $max === null ? 10 : ((int) $max) + 10;
    }

    // category_id_changed_action: chuyển bài sang category khác thì xếp nó xuống cuối.
    private function syncPositionOnCategoryChange(): void
    {
        if (! $this->wasChanged('category_id')) {
            return;
        }

        $position = $this->nextPositionInCategory();
        $this->newQuery()->whereKey($this->id)->update(['position' => $position]);
        $this->setAttribute('position', $position);
        $this->syncOriginalAttribute('position');
    }
}
