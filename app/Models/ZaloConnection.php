<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

/**
 * Mỗi record = 1 tài khoản Zalo cá nhân được kết nối vào 1 workspace.
 *
 * connection_id: bigint UNIQUE cross-tenant (từ sequence zalo_connection_id_seq).
 * Bridge dùng connection_id làm "slot key" — Laravel lookup workspace_id từ đây
 * qua pgsql_privileged (bypass RLS) rồi mới bind TenantScope.
 *
 * state enum values: disconnected | qr_waiting | connected | session_lost
 *
 * @property int $id
 * @property string $workspace_id
 * @property int $connection_id UNIQUE cross-tenant
 * @property string|null $channel_account_id
 * @property string|null $personal_uid
 * @property string|null $display_name
 * @property string|null $avatar_url
 * @property string $state
 * @property string|null $session_lost_reason
 * @property Carbon|null $last_connected_at
 * @property Carbon|null $last_session_lost_at Tier 0: timestamp khi session bị mất, FE dùng so gap với last_connected_at
 * @property Carbon|null $last_qr_at
 * @property int $lock_version
 */
class ZaloConnection extends Model
{
    use SoftDeletes;

    protected $table = 'zalo_connections';

    protected $fillable = [
        'workspace_id',
        'connection_id',
        'channel_account_id',
        'personal_uid',
        'display_name',
        'avatar_url',
        'state',
        'session_lost_reason',
        'last_connected_at',
        'last_session_lost_at',
        'last_qr_at',
        'lock_version',
    ];

    protected $casts = [
        'connection_id' => 'integer',
        'last_connected_at' => 'datetime',
        'last_session_lost_at' => 'datetime',
        'last_qr_at' => 'datetime',
        'lock_version' => 'integer',
    ];

    /**
     * Lấy connection_id tiếp theo từ sequence (dùng khi tạo connection mới).
     * Bridge sẽ dùng giá trị này khi promote QR → slot.
     */
    public static function nextConnectionId(): int
    {
        // P10 hardening [d]: connection MẶC ĐỊNH — sequence đã GRANT cho cho_rach_app
        // (migration 2026_07_04_300001), không cần privileged cho nextval.
        $row = DB::selectOne("SELECT nextval('zalo_connection_id_seq') AS id");

        return (int) $row->id;
    }

    /**
     * Lookup workspace_id từ connection_id qua pgsql_privileged (bypass RLS).
     * Dùng trong webhook controller trước khi TenantScope::bind().
     */
    public static function workspaceForConnection(int $connectionId): ?string
    {
        $row = DB::connection('pgsql_privileged')
            ->table('zalo_connections')
            ->select('workspace_id')
            ->where('connection_id', $connectionId)
            ->whereNull('deleted_at')
            ->first();

        return $row?->workspace_id;
    }

    /**
     * P08 — lookup channel_account_id từ connection_id qua pgsql_privileged (bypass
     * RLS). Bao gồm cả connection đã soft-delete — reconnect mint connection_id mới
     * nhưng cùng tài khoản (channel_account_id); inbound dùng account_id này để key
     * conversation trực tiếp (channel_account_id, peer_uid) — 1 nguồn sự thật.
     */
    public static function channelAccountIdForConnection(int $connectionId): ?string
    {
        $row = DB::connection('pgsql_privileged')
            ->table('zalo_connections')
            ->select('channel_account_id')
            ->where('connection_id', $connectionId)
            ->first();

        return $row?->channel_account_id;
    }

    /**
     * Slot 'connected' của 1 channel_account, workspace-scoped (P03/P04 single
     * source cho outbound resolve + reconnect fail-closed). Trả về Collection
     * (không first()) — caller quyết định fail-closed khi count() !== 1.
     *
     * @return Collection<int, static>
     */
    public static function connectedForAccount(string $workspaceId, string $channelAccountId): Collection
    {
        return static::query()
            ->where('workspace_id', $workspaceId)
            ->where('channel_account_id', $channelAccountId)
            ->where('state', 'connected')
            ->whereNull('deleted_at')
            ->get();
    }

    /**
     * Cập nhật state và session_lost_reason từ bridge_session event.
     *
     * P10: $privileged=true (default) cho webhook (RLS session var có thể chưa set);
     * promote/settings flow (request ĐÃ bind tenant) truyền false → đi CÙNG session
     * mặc định, né treo chéo session (bài học 04/07).
     */
    public function updateState(string $state, ?string $lostReason = null, bool $privileged = true): void
    {
        $updates = ['state' => $state, 'updated_at' => now()];

        if ($state === 'connected') {
            $updates['last_connected_at'] = now();
            $updates['session_lost_reason'] = null;
            // Tier 0: KHÔNG clear last_session_lost_at — FE so sánh [last_session_lost_at, last_connected_at] tính gap
        } elseif ($state === 'session_lost') {
            $updates['last_session_lost_at'] = now();
            if ($lostReason !== null) {
                $updates['session_lost_reason'] = $lostReason;
            }
        } elseif ($state === 'qr_waiting') {
            $updates['last_qr_at'] = now();
        }

        DB::connection($privileged ? 'pgsql_privileged' : config('database.default'))
            ->table('zalo_connections')
            ->where('id', $this->id)
            ->update($updates);

        $this->fill($updates);
    }
}
