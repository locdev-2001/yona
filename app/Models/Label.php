<?php

namespace App\Models;

use App\Jobs\Labels\UpdateJob;
use Database\Factories\LabelFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

// Port từ refs/chatwoot/app/models/label.rb.
// Bỏ: messages/reporting_events (báo cáo nhãn — nhóm E), AccountCacheRevalidator
// (cache key theo account — chưa port).
class Label extends Model
{
    /** @use HasFactory<LabelFactory> */
    use HasFactory;

    // RegexHelper::UNICODE_CHARACTER_NUMBER_HYPHEN_UNDERSCORE — ít nhất 2 ký tự,
    // không mở đầu bằng `_`/`-`, không khoảng trắng.
    public const TITLE_REGEX = '/\A[\p{L}\p{N}]+[\p{L}\p{N}_-]+\z/u';

    public const DEFAULT_COLOR = '#1f93ff';

    // default_scope { order(:title) } — gỡ bằng withoutGlobalScope(self::ORDER_SCOPE)
    // ở nơi cần thứ tự gắn nhãn thay vì thứ tự bảng chữ cái.
    public const ORDER_SCOPE = 'title';

    protected $attributes = [
        'color' => self::DEFAULT_COLOR,
    ];

    protected $fillable = [
        'account_id',
        'title',
        'description',
        'color',
        'show_on_sidebar',
    ];

    protected function casts(): array
    {
        return [
            'show_on_sidebar' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope(self::ORDER_SCOPE, fn (Builder $query) => $query->orderBy('labels.title'));

        static::saving(function (Label $label) {
            if ($label->title !== null) {
                $label->title = self::normalizeTitle($label->title);
            }
        });

        // after_update_commit :update_associated_models — đổi tên nhãn thì mọi
        // liên kết đang trỏ tới nhãn phải mang tên mới.
        static::updated(function (Label $label) {
            if ($label->wasChanged('title')) {
                UpdateJob::dispatch($label->title, $label->account_id);
            }
        });
    }

    // before_validation { self.title = title.downcase } — validate chạy TRÊN tên
    // đã chuẩn hóa nên nơi nhận input phải gọi hàm này trước khi kiểm tra.
    public static function normalizeTitle(string $title): string
    {
        return mb_strtolower($title);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function taggings(): HasMany
    {
        return $this->hasMany(Tagging::class);
    }

    /** @return MorphToMany<Conversation, $this> */
    public function conversations(): MorphToMany
    {
        return $this->morphedByMany(Conversation::class, 'taggable', 'taggings', 'label_id', 'taggable_id');
    }

    /** @return MorphToMany<Contact, $this> */
    public function contacts(): MorphToMany
    {
        return $this->morphedByMany(Contact::class, 'taggable', 'taggings', 'label_id', 'taggable_id');
    }
}
