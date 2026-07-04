<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * P01 (inbox-multichannel-relayer) — L2 core: danh tính "SIM" ổn định
 * (account_uid = getOwnId()), tách khỏi session slot (ZaloConnection).
 *
 * status: needs_qr | connected | session_lost.
 * gap_started_at/gap_open: cửa sổ gap account-level cho marker P05.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $channel
 * @property string $account_uid
 * @property string|null $display_name
 * @property string|null $avatar_url
 * @property string $status
 * @property Carbon|null $gap_started_at
 * @property bool $gap_open
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class ChannelAccount extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $fillable = [
        'channel',
        'account_uid',
        'display_name',
        'avatar_url',
        'status',
        'gap_started_at',
        'gap_open',
    ];

    protected function casts(): array
    {
        return [
            'gap_started_at' => 'datetime',
            'gap_open' => 'boolean',
        ];
    }

    /** @return HasMany<Conversation, $this> */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    /**
     * P04 — find-or-create theo (workspace, channel, account_uid), LOCK FOR
     * UPDATE. Caller (PromoteAccountBinder) PHẢI gọi bên trong 1 transaction
     * đã mở — hàm này không tự mở transaction (lock chỉ có tác dụng trong
     * transaction bao ngoài).
     *
     * Connection MẶC ĐỊNH (không pgsql_privileged): promote() chạy trong
     * request tenant đã bind RLS (IdentifyWorkspace middleware) — không cần
     * bypass. Dùng pgsql_privileged ở đây sẽ mở 1 session Postgres khác, không
     * thấy được row Workspace/ChannelAccount vừa insert còn trong transaction
     * mặc định (vỡ FK khi test) — xem PromoteAccountBinder.
     *
     * workspace_id KHÔNG mass-assign (không có trong $fillable, giống
     * Conversation/Message) — auto-stamp qua BelongsToWorkspace::creating từ
     * currentWorkspace().
     */
    public static function findOrCreateForBind(string $workspaceId, string $channel, string $accountUid): self
    {
        $existing = static::query()
            ->where('workspace_id', $workspaceId)
            ->where('channel', $channel)
            ->where('account_uid', $accountUid)
            ->lockForUpdate()
            ->first();

        if ($existing) {
            return $existing;
        }

        return static::create([
            'channel' => $channel,
            'account_uid' => $accountUid,
            'status' => 'needs_qr',
        ]);
    }
}
