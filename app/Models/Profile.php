<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Một con người — cái neo nói rằng những bí danh này là cùng một người.
 *
 * KHÔNG giữ một trường cá nhân nào. Tên, số điện thoại, avatar đều nằm ở
 * `profile_identities`. Nhờ vậy gộp hai hồ sơ không phải hòa giải trường nào,
 * chỉ là đổi `profile_id` trên vài hàng bí danh — và gộp là việc hằng ngày.
 *
 * @property string $id
 * @property string $workspace_id
 * @property bool $is_identified
 * @property int|null $profile_number
 * @property string|null $merged_into_id
 * @property Carbon|null $first_seen_at
 * @property Carbon|null $last_seen_at
 * @property array<string, mixed> $custom_fields
 */
class Profile extends Model
{
    use BelongsToWorkspace;
    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'workspace_id',
        'profile_number',
        'merged_into_id',
        'first_seen_at',
        'last_seen_at',
        'custom_fields',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_identified' => 'boolean',
            'profile_number' => 'integer',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'custom_fields' => 'array',
        ];
    }

    /** @return HasMany<ProfileIdentity, $this> */
    public function identities(): HasMany
    {
        return $this->hasMany(ProfileIdentity::class);
    }

    /** @return BelongsTo<Profile, $this> */
    public function mergedInto(): BelongsTo
    {
        return $this->belongsTo(self::class, 'merged_into_id');
    }

    /**
     * Hồ sơ còn sống hay đã bị gộp vào hồ sơ khác.
     *
     * Đọc `merged_into_id` chỉ được đi ĐÚNG MỘT BƯỚC — gộp luôn làm phẳng chuỗi,
     * xem MergeProfilesService. Không có luật đó thì sau vài tháng phải lặp
     * nhiều vòng mới ra hồ sơ gốc.
     */
    public function isMerged(): bool
    {
        return $this->merged_into_id !== null;
    }
}
