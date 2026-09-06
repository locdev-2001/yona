<?php

namespace App\Models;

use App\Models\Concerns\SelfValidating;
use App\Services\HelpCenter\SlugGenerator;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/models/category.rb.
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory, SelfValidating;

    public const PER_PAGE = 1000;

    protected $fillable = [
        'account_id', 'portal_id', 'name', 'description', 'position', 'locale', 'slug',
        'parent_category_id', 'associated_category_id', 'icon', 'icon_color',
    ];

    protected $attributes = [
        'locale' => 'en',
        'icon' => '',
        'icon_color' => '',
    ];

    protected static function booted(): void
    {
        static::saving(function (Category $category) {
            $category->ensureAccountId();
            $category->ensureSlug();
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

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }

    public function parentCategory(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_category_id');
    }

    public function subCategories(): HasMany
    {
        return $this->hasMany(self::class, 'parent_category_id');
    }

    // belongs_to :root_category, foreign_key: :associated_category_id.
    public function rootCategory(): BelongsTo
    {
        return $this->belongsTo(self::class, 'associated_category_id');
    }

    public function associatedCategories(): HasMany
    {
        return $this->hasMany(self::class, 'associated_category_id');
    }

    // has_many :related_categories, through: :category_related_categories — quan hệ
    // MỘT CHIỀU: A liên quan B không tự khiến B liên quan A.
    public function relatedCategories(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'related_categories', 'category_id', 'related_category_id')
            ->withTimestamps()
            ->orderBy('related_categories.id');
    }

    /** @return Builder<static> */
    public static function forPortal(Portal $portal): Builder
    {
        return self::query()->where('categories.portal_id', $portal->id);
    }

    /** @param Builder<static> $query */
    public function scopeSearchByLocale(Builder $query, ?string $locale): void
    {
        if ((string) $locale !== '') {
            $query->where('categories.locale', $locale);
        }
    }

    /**
     * Category.search — lọc theo locale, sắp xếp theo position.
     *
     * @param  array<string, mixed>  $params
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public static function search(Builder $query, array $params): Builder
    {
        return $query->searchByLocale($params['locale'] ?? null)->orderBy('categories.position');
    }

    /** @param array<int|string, int|string> $positions */
    public static function updatePositions(Portal $portal, array $positions): void
    {
        if ($positions === []) {
            return;
        }

        DB::transaction(function () use ($portal, $positions) {
            foreach ($positions as $categoryId => $position) {
                $portal->categories()->whereKey((int) $categoryId)->firstOrFail()->update(['position' => (int) $position]);
            }
        });
    }

    /** @return list<string> */
    public function validationMessages(): array
    {
        $this->ensureAccountId();
        $this->ensureSlug();

        $messages = [];

        if ($this->account_id === null) {
            $messages[] = "Account can't be blank";
        }

        if ((string) $this->slug === '') {
            $messages[] = "Slug can't be blank";
        }

        if ((string) $this->name === '') {
            $messages[] = "Name can't be blank";
        }

        $portal = $this->portal;

        if ($portal !== null && ! in_array((string) $this->locale, $portal->allowedLocaleCodes(), true)) {
            $messages[] = sprintf(
                "Locale %s of category is not part of portal's %s.",
                $this->locale,
                json_encode($portal->allowedLocaleCodes()),
            );
        }

        if ($this->localeTaken()) {
            $messages[] = 'Locale should be unique in the category and portal';
        }

        return [...$messages, ...$this->lengthMessages([
            'name' => 255, 'slug' => 255, 'locale' => 255, 'description' => 20000,
        ])];
    }

    private function localeTaken(): bool
    {
        if ($this->portal_id === null || (string) $this->slug === '') {
            return false;
        }

        return self::query()
            ->where('portal_id', $this->portal_id)
            ->where('slug', $this->slug)
            ->where('locale', $this->locale)
            ->whereKeyNot($this->id ?? 0)
            ->exists();
    }

    private function ensureAccountId(): void
    {
        $this->account_id = $this->portal?->account_id ?? $this->account_id;
    }

    // Người dùng không điền slug: sinh từ tên, duy nhất trong (portal, locale).
    private function ensureSlug(): void
    {
        if ((string) $this->slug !== '') {
            return;
        }

        $this->slug = SlugGenerator::unique(
            $this->name,
            fn (string $candidate) => self::query()
                ->where('portal_id', $this->portal_id)
                ->where('locale', $this->locale)
                ->where('slug', $candidate)
                ->whereKeyNot($this->id ?? 0)
                ->exists(),
        );
    }
}
