<?php

namespace App\Services\Zalo;

use App\Models\ChannelAccount;
use App\Models\ZaloConnection;
use App\Services\Rekey\DuplicateConversationMerger;
use Illuminate\Support\Facades\DB;

/**
 * P04 (inbox-multichannel-relayer) — gắn slot (ZaloConnection) vào tài khoản
 * (ChannelAccount) trong 1 transaction. Cổng chống trộn 2 tài khoản Zalo —
 * caller (ZaloConnectionController::promote) đã xác nhận uid khớp trước khi
 * gọi bind() (mismatch fail-closed 409, KHÔNG tới đây).
 *
 * Thứ tự BẮT BUỘC trong transaction: lock account FOR UPDATE → tắt MỌI slot
 * cũ non-deleted trùng account/uid TRƯỚC (bất kể state — xem comment tại query)
 * → bật slot mới → dọn conversation trùng (nếu có). Đảo thứ tự bật/tắt va
 * partial unique P02(g) `(channel_account_id) WHERE state='connected'` → 23505.
 *
 * DuplicateConversationMerger (P02, tự chứa — không còn phụ thuộc
 * ZaloConversationMerger, class đó xoá ở P08) dọn nhóm (channel_account_id,
 * peer_uid) trùng nếu có: race hẹp khi inbound lỡ đến slot mới TRƯỚC khi bind
 * transaction này commit (slot chưa có channel_account_id lúc đó, upsertConversation
 * tạo conversation riêng). on(null) = share connection MẶC ĐỊNH với transaction
 * này (không pgsql_privileged — khác session sẽ không thấy thay đổi uncommitted).
 *
 * Tắt slot cũ = session_lost + soft-delete (không chỉ đổi state): constraint
 * CŨ `zalo_connections_ws_personal_uid_active_unique` (workspace_id,
 * personal_uid) WHERE deleted_at IS NULL vẫn còn hiệu lực (P02g deferred) —
 * 2 slot cùng personal_uid, cùng non-deleted → 23505 nếu không soft-delete.
 * Plan P04 cho phép cả 2 lựa chọn ("session_lost hoặc soft-delete"); chọn
 * soft-delete để tương thích constraint cũ cho tới khi P02(g) swap.
 *
 * Match slot cũ theo channel_account_id HOẶC personal_uid: slot chưa qua
 * backfill P02 (channel_account_id NULL, ví dụ pre-existing/legacy) vẫn phải
 * bị tắt nếu trùng personal_uid — nếu không, UPDATE personal_uid của slot mới
 * đụng chính constraint cũ ở trên.
 *
 * Connection MẶC ĐỊNH (không pgsql_privileged): promote() chạy trong request
 * tenant đã bind RLS (IdentifyWorkspace middleware) — ghi xuyên 2 bảng
 * (zalo_connections, channel_accounts) đều cùng workspace, RLS policy tự
 * chặn cross-tenant. Lọc workspace_id tường minh thêm 1 lớp phòng thủ.
 */
class PromoteAccountBinder
{
    public function __construct(private readonly DuplicateConversationMerger $duplicateMerger) {}

    /**
     * @param  array<string, mixed>  $profile  {personal_uid?, display_name?, avatar_url?}
     */
    public function bind(ZaloConnection $connection, string $accountUid, array $profile): ChannelAccount
    {
        return DB::transaction(function () use ($connection, $accountUid, $profile) {
            $account = ChannelAccount::findOrCreateForBind($connection->workspace_id, 'zalo_personal', $accountUid);

            // Tắt slot cũ TRƯỚC (thứ tự bắt buộc) — session_lost + soft-delete.
            // KHÔNG lọc state: slot session_lost chưa soft-delete (trạng thái
            // handleBridgeSession để lại — flow reconnect thường gặp nhất) vẫn chiếm
            // ws_personal_uid_active_unique (predicate deleted_at IS NULL, không quan
            // tâm state) → nếu bỏ sót, UPDATE personal_uid của slot mới 23505.
            DB::table('zalo_connections')
                ->where('workspace_id', $connection->workspace_id)
                ->where('id', '!=', $connection->id)
                ->whereNull('deleted_at')
                ->where(function ($query) use ($account, $accountUid) {
                    $query->where('channel_account_id', $account->id)
                        ->orWhere('personal_uid', $accountUid);
                })
                ->update(['state' => 'session_lost', 'deleted_at' => now(), 'updated_at' => now()]);

            // Bật slot mới, gắn vào account.
            DB::table('zalo_connections')
                ->where('id', $connection->id)
                ->update(array_merge($profile, [
                    'channel_account_id' => $account->id,
                    'state' => 'connected',
                    'updated_at' => now(),
                ]));

            $accountUpdates = array_filter([
                'status' => 'connected',
                'gap_open' => false,
                'display_name' => $profile['display_name'] ?? null,
                'avatar_url' => $profile['avatar_url'] ?? null,
            ], fn ($v) => $v !== null);
            $accountUpdates['updated_at'] = now();

            DB::table('channel_accounts')
                ->where('id', $account->id)
                ->update($accountUpdates);

            $this->mergeDuplicateConversationsFor($account->id);

            $account->fill($accountUpdates);

            return $account;
        });
    }

    /**
     * Dọn nhóm (channel_account_id, peer_uid) trùng do race inbound/bind (hiếm) —
     * quét toàn workspace (RLS-scoped) rồi lọc về đúng account vừa bind.
     */
    private function mergeDuplicateConversationsFor(string $channelAccountId): void
    {
        $merger = $this->duplicateMerger->on(null);

        foreach ($merger->duplicateGroups() as $group) {
            if ($group->channel_account_id === $channelAccountId) {
                $merger->mergeGroup($group->channel_account_id, $group->peer_uid);
            }
        }
    }
}
