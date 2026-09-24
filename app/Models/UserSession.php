<?php

namespace App\Models;

use Database\Factories\UserSessionFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Port app/models/user_session.rb — một dòng cho mỗi phiên đăng nhập của user.
// `client_id` là id phiên của tầng session (bản gốc: client của devise_token_auth,
// Yona: id phiên Laravel), nên revoke một dòng ở đây = đăng xuất đúng thiết bị đó.
class UserSession extends Model
{
    /** @use HasFactory<UserSessionFactory> */
    use HasFactory, MassPrunable;

    public const ACTIVITY_THROTTLE_MINUTES = 5;

    protected $fillable = [
        'user_id',
        'client_id',
        'ip_address',
        'user_agent',
        'browser_name',
        'browser_version',
        'device_name',
        'platform_name',
        'platform_version',
        'city',
        'country',
        'country_code',
        'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'last_activity_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isCurrent(?string $activeClientId): bool
    {
        return $activeClientId !== null && $this->client_id === $activeClientId;
    }

    // Phiên trên store đã hết hạn thì dòng này chỉ còn chiếm chỗ trong trần số
    // phiên. Cộng thêm nhịp ghi hoạt động vì last_activity_at có thể trễ đúng
    // chừng ấy so với lần thao tác thật.
    /** @return Builder<self> */
    public function prunable(): Builder
    {
        $idleMinutes = (int) config('session.lifetime') + self::ACTIVITY_THROTTLE_MINUTES;

        return static::query()->whereRaw(
            'COALESCE(last_activity_at, created_at) < ?',
            [now()->subMinutes($idleMinutes)],
        );
    }

    public function shouldUpdateActivity(): bool
    {
        return $this->last_activity_at === null
            || $this->last_activity_at->lt(now()->subMinutes(self::ACTIVITY_THROTTLE_MINUTES));
    }
}
