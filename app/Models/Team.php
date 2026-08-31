<?php

namespace App\Models;

use Database\Factories\TeamFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Port từ refs/chatwoot/app/models/team.rb.
// Bỏ: conversations/messages/reporting_events (nhóm B–D), cache invalidation
// unread counts (cùng B4), push_event_data (realtime B4), Audit::Team (EE).
class Team extends Model
{
    /** @use HasFactory<TeamFactory> */
    use HasFactory;

    protected $fillable = [
        'account_id',
        'name',
        'description',
        'allow_auto_assign',
        'icon',
        'icon_color',
    ];

    protected function casts(): array
    {
        return [
            'allow_auto_assign' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Team $team) {
            if ($team->name !== null) {
                $team->name = self::normalizeName($team->name);
            }
        });
    }

    // before_validation của Chatwoot: bỏ ký tự điều khiển, trim, hạ chữ thường.
    // Validate (presence + unique) phải chạy TRÊN tên đã chuẩn hóa, nên nơi
    // nhận input gọi hàm này trước khi kiểm tra.
    public static function normalizeName(string $name): string
    {
        return mb_strtolower(trim((string) preg_replace('/[[:cntrl:]]/u', '', $name)));
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function teamMembers(): HasMany
    {
        return $this->hasMany(TeamMember::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_members')->withTimestamps();
    }

    /**
     * @param  list<int>  $userIds
     * @return list<User>
     */
    public function addMembers(array $userIds): array
    {
        foreach ($userIds as $userId) {
            $this->teamMembers()->firstOrCreate(['user_id' => $userId]);
        }

        return $this->members()->whereIn('users.id', $userIds)->get()->all();
    }

    /** @param list<int> $userIds */
    public function removeMembers(array $userIds): void
    {
        $this->teamMembers()->whereIn('user_id', $userIds)->delete();
    }
}
