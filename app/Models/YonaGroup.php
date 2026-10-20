<?php

namespace App\Models;

use App\Models\Concerns\Avatarable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Nhóm giữa người dùng Yona. Tin của nhóm lưu một bản trong hội thoại gốc thuộc account
// ẩn của nhóm (account không có ai làm quản trị nên không ai mở được); mỗi thành viên có
// một dòng hội thoại trong hộp thư Yona của mình trỏ tới hội thoại gốc.
class YonaGroup extends Model
{
    // Ảnh quản trị tải lên; có ảnh thì ảnh thắng hình khối và ảnh ghép thành viên.
    use Avatarable;

    public const MAX_MEMBERS = 500;

    public const CONTACT_SOURCE_PREFIX = 'yona-group:';

    // Avatar quản trị chọn từ lưới hình khối dựng sẵn: `pick-1`, `pick-2`…
    public const AVATAR_SEED_PATTERN = '/^pick-\d{1,4}$/';

    // Chưa chọn avatar thì ghép ảnh vài thành viên; nạp dư một người để bỏ được chính người xem.
    public const AVATAR_MEMBER_COUNT = 3;

    protected $fillable = ['account_id', 'conversation_id', 'name', 'avatar_path', 'avatar_seed', 'description', 'created_by_id', 'member_count'];

    public static function contactSourceIdFor(int $groupId): string
    {
        return self::CONTACT_SOURCE_PREFIX.$groupId;
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /** @return HasMany<YonaGroupMember, $this> */
    public function members(): HasMany
    {
        return $this->hasMany(YonaGroupMember::class);
    }

    /** @return HasMany<YonaGroupMember, $this> */
    public function activeMembers(): HasMany
    {
        return $this->members()->whereNull('left_at');
    }

    /** @return HasMany<YonaGroupMember, $this> */
    public function avatarMembers(): HasMany
    {
        return $this->activeMembers()->with('user')->orderBy('created_at')->orderBy('id')->limit(self::AVATAR_MEMBER_COUNT + 1);
    }

    /** @return HasMany<YonaGroupInviteLink, $this> */
    public function inviteLinks(): HasMany
    {
        return $this->hasMany(YonaGroupInviteLink::class);
    }

    public function activeMemberFor(User $user): ?YonaGroupMember
    {
        return $this->activeMembers()->where('user_id', $user->id)->first();
    }
}
