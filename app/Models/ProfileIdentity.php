<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Một bí danh của một người, kèm mọi thông tin cá nhân biết được qua bí danh đó.
 *
 * Ba cột dễ lẫn vì chúng trả lời ba câu khác nhau:
 *   key + value  — bí danh này LÀ GÌ
 *   source       — ta BIẾT ĐƯỢC TỪ ĐÂU
 *   channels     — người này ĐANG DÙNG KÊNH NÀO
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $profile_id
 * @property string $key
 * @property string $value
 * @property string $source
 * @property string|null $channel_account_id
 * @property list<string> $channels
 * @property string|null $display_name
 * @property array<string, array{name?: string|null, avatar?: string|null, seen_at?: string|null}> $channel_profiles
 * @property array<string, mixed> $attributes
 * @property bool $is_verified
 * @property Carbon|null $first_seen_at
 * @property Carbon|null $last_seen_at
 */
class ProfileIdentity extends Model
{
    use BelongsToWorkspace;
    use HasUuids;

    /** Bí danh có giá trị này thì hồ sơ được coi là ĐÃ ĐỊNH DANH. */
    public const IDENTIFYING_KEYS = ['phone', 'email'];

    protected $fillable = [
        'workspace_id',
        'profile_id',
        'key',
        'value',
        'source',
        'channel_account_id',
        'channels',
        'display_name',
        'channel_profiles',
        'attributes',
        'is_verified',
        'first_seen_at',
        'last_seen_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'channel_profiles' => 'array',
            'attributes' => 'array',
            'is_verified' => 'boolean',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Profile, $this> */
    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }

    public function isIdentifying(): bool
    {
        return in_array($this->key, self::IDENTIFYING_KEYS, true);
    }
}
