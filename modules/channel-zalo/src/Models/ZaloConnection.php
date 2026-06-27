<?php

namespace Modules\ChannelZalo\Models;

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
 * @property int    $id
 * @property string $workspace_id
 * @property int    $connection_id  UNIQUE cross-tenant
 * @property string|null $personal_uid
 * @property string|null $display_name
 * @property string|null $avatar_url
 * @property string $state
 * @property string|null $session_lost_reason
 * @property \Carbon\Carbon|null $last_connected_at
 * @property \Carbon\Carbon|null $last_qr_at
 * @property int $lock_version
 */
class ZaloConnection extends Model
{
    use SoftDeletes;

    protected $table = 'zalo_connections';

    protected $fillable = [
        'workspace_id',
        'connection_id',
        'personal_uid',
        'display_name',
        'avatar_url',
        'state',
        'session_lost_reason',
        'last_connected_at',
        'last_qr_at',
        'lock_version',
    ];

    protected $casts = [
        'connection_id'    => 'integer',
        'last_connected_at' => 'datetime',
        'last_qr_at'       => 'datetime',
        'lock_version'     => 'integer',
    ];

    /**
     * Lấy connection_id tiếp theo từ sequence (dùng khi tạo connection mới).
     * Bridge sẽ dùng giá trị này khi promote QR → slot.
     */
    public static function nextConnectionId(): int
    {
        $row = DB::connection('pgsql_privileged')->selectOne(
            "SELECT nextval('zalo_connection_id_seq') AS id"
        );

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
     * Cập nhật state và session_lost_reason từ bridge_session event.
     */
    public function updateState(string $state, ?string $lostReason = null): void
    {
        $updates = ['state' => $state];

        if ($state === 'connected') {
            $updates['last_connected_at'] = now();
            $updates['session_lost_reason'] = null;
        } elseif ($state === 'session_lost' && $lostReason !== null) {
            $updates['session_lost_reason'] = $lostReason;
        } elseif ($state === 'qr_waiting') {
            $updates['last_qr_at'] = now();
        }

        $this->fill($updates)->save();
    }
}
