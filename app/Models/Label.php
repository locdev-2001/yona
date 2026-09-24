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

// Bỏ: messages/reporting_events (báo cáo nhãn — nhóm E), AccountCacheRevalidator
// (cache key theo account — chưa port).
class Label extends Model
{
    /** @use HasFactory<LabelFactory> */
    use HasFactory;

    // Tên nhãn là tên hiển thị tự do. Chỉ chặn xuống dòng để một label vẫn là
    // một dòng trong chip, sidebar và URL filter; khoảng trắng/ký hiệu/chữ hoa
    // đều được giữ nguyên.
    public const TITLE_REGEX = '/\A[^\r\n]+\z/u';

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

    // Chuẩn hóa duy nhất là trim hai đầu; không biến tên hiển thị thành slug và
    // không hạ chữ thường.
    public static function normalizeTitle(string $title): string
    {
        return trim($title);
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
