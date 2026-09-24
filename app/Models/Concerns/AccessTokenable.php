<?php

namespace App\Models\Concerns;

use App\Models\AccessToken;
use Illuminate\Database\Eloquent\Relations\MorphOne;

// Chủ sở hữu token Application API: có token ngay khi tạo, token mất theo khi
// chủ bị xoá. access_tokens là quan hệ đa hình nên không có FK kéo token theo —
// vòng đời token chỉ được giữ ở đây. Thêm loại chủ mới = dùng trait này.
trait AccessTokenable
{
    public static function bootAccessTokenable(): void
    {
        static::created(function (self $owner) {
            $owner->accessToken()->create([]);
        });

        static::deleted(function (self $owner) {
            $owner->accessToken()->delete();
        });
    }

    public function accessToken(): MorphOne
    {
        return $this->morphOne(AccessToken::class, 'owner');
    }
}
