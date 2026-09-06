<?php

namespace App\Models\Integrations;

use App\Models\Account;
use App\Models\Concerns\Reauthorizable;
use App\Models\Inbox;
use App\Support\Integrations\App;
use Database\Factories\Integrations\HookFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/models/integrations/hook.rb — một kết nối đã bật
// giữa account (hoặc inbox) và một ứng dụng trong danh mục tích hợp.
class Hook extends Model
{
    /** @use HasFactory<HookFactory> */
    use HasFactory, Reauthorizable;

    // Reauthorizable::AUTHORIZATION_ERROR_THRESHOLD mặc định của bản gốc.
    public const AUTHORIZATION_ERROR_THRESHOLD = 2;

    protected $table = 'integrations_hooks';

    public const STATUS_DISABLED = 0;

    public const STATUS_ENABLED = 1;

    public const TYPE_ACCOUNT = 0;

    public const TYPE_INBOX = 1;

    public const HOOK_TYPES = [self::TYPE_ACCOUNT => 'account', self::TYPE_INBOX => 'inbox'];

    protected $fillable = [
        'account_id',
        'inbox_id',
        'app_id',
        'hook_type',
        'status',
        'reference_id',
        'access_token',
        'settings',
    ];

    protected $attributes = [
        'status' => self::STATUS_ENABLED,
        'hook_type' => self::TYPE_ACCOUNT,
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'status' => 'integer',
            'hook_type' => 'integer',
        ];
    }

    // has_secure_token :access_token — sinh lúc tạo, dùng chung khuôn với secret.
    protected static function booted(): void
    {
        static::creating(function (self $hook) {
            $hook->access_token ??= Str::random(24);
        });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function inbox(): BelongsTo
    {
        return $this->belongsTo(Inbox::class);
    }

    public function scopeAccountHooks(Builder $query): Builder
    {
        return $query->where('hook_type', self::TYPE_ACCOUNT);
    }

    public function scopeInboxHooks(Builder $query): Builder
    {
        return $query->where('hook_type', self::TYPE_INBOX);
    }

    public function app(): ?App
    {
        return App::find((string) $this->app_id);
    }

    public function hookTypeName(): string
    {
        return self::HOOK_TYPES[$this->hook_type] ?? 'account';
    }

    public function isEnabled(): bool
    {
        return $this->status === self::STATUS_ENABLED;
    }

    public function isDisabled(): bool
    {
        return ! $this->isEnabled();
    }

    public function disable(): void
    {
        $this->update(['status' => self::STATUS_DISABLED]);
    }

    /** Giá trị hiển thị/gửi đi của một khoá settings, chịu cả khoá chuỗi lẫn ký hiệu. */
    public function setting(string $key): mixed
    {
        return $this->settings[$key] ?? null;
    }
}
