<?php

namespace App\Models;

use Database\Factories\PlatformAppFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;

// Port từ refs/chatwoot/app/models/platform_app.rb — ứng dụng gọi Platform API,
// xác thực bằng access_token đa hình (AccessTokenable).
class PlatformApp extends Model
{
    /** @use HasFactory<PlatformAppFactory> */
    use HasFactory;

    protected $fillable = ['name'];

    protected static function booted(): void
    {
        static::created(function (PlatformApp $platformApp) {
            $platformApp->accessToken()->create([]);
        });

        static::deleting(function (PlatformApp $platformApp) {
            $platformApp->platformAppPermissibles()->delete();
            $platformApp->accessToken()->delete();
        });
    }

    public function accessToken(): MorphOne
    {
        return $this->morphOne(AccessToken::class, 'owner');
    }

    public function platformAppPermissibles(): HasMany
    {
        return $this->hasMany(PlatformAppPermissible::class);
    }

    /** Kiểm quyền của app trên một bản ghi cụ thể (validate_platform_app_permissible). */
    public function permits(Model $resource): bool
    {
        return $this->platformAppPermissibles()
            ->where('permissible_type', $resource->getMorphClass())
            ->where('permissible_id', $resource->getKey())
            ->exists();
    }

    /** find_or_create_by(permissible:) của bản gốc. */
    public function permit(Model $resource): PlatformAppPermissible
    {
        return $this->platformAppPermissibles()->firstOrCreate([
            'permissible_type' => $resource->getMorphClass(),
            'permissible_id' => $resource->getKey(),
        ]);
    }
}
