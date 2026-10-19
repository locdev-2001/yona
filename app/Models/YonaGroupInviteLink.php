<?php

namespace App\Models;

use App\Models\Concerns\InviteToken;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Link mời vào nhóm: ai có link cũng vào được, khác với thêm trực tiếp (chỉ bạn bè).
class YonaGroupInviteLink extends Model
{
    use InviteToken;

    protected $fillable = ['yona_group_id', 'created_by_id', 'token_digest', 'expires_at', 'max_uses', 'use_count', 'revoked_at'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /** @return array{0: self, 1: string} */
    public static function issue(YonaGroup $group, User $creator, ?int $expiresInDays, ?int $maxUses): array
    {
        $token = self::generateToken();

        $link = self::create([
            'yona_group_id' => $group->id,
            'created_by_id' => $creator->id,
            'token_digest' => self::hashToken($token),
            'expires_at' => $expiresInDays === null ? null : now()->addDays($expiresInDays),
            'max_uses' => $maxUses,
            'use_count' => 0,
        ]);

        return [$link, $token];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(YonaGroup::class, 'yona_group_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}
