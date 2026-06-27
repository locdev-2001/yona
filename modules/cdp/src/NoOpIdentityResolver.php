<?php

namespace Modules\Cdp;

use Modules\Cdp\Contracts\IdentityResolver;

/**
 * No-op placeholder của IdentityResolver — Phase-03 scaffold.
 *
 * Bound bởi CdpServiceProvider làm default. Phase-07 override binding này
 * bằng implementation dedup thật (ContactService + resolveOrCreateFromPeer).
 *
 * Quy tắc an toàn:
 *  - resolveByPhone / resolveOrCreateFromPeer → trả null (Conversation giữ
 *    contact_id = NULL = "Liên hệ nháp"; không gây lỗi runtime).
 *  - mergeIdentities → no-op (không làm gì, không throw); caller không bị gián đoạn.
 *
 * ponytail: no-op tồn tại đúng chủ đích — placeholder an toàn đến khi Phase-07
 * bind đè. Xóa/thay thế class này khi Phase-07 cung cấp impl thật.
 */
final class NoOpIdentityResolver implements IdentityResolver
{
    public function resolveByPhone(string $workspaceId, ?string $phone): ?object
    {
        return null; // no-op: Phase-07 cung cấp impl thật
    }

    public function resolveOrCreateFromPeer(
        string $workspaceId,
        string $channel,
        string $peerUid,
        ?string $phone,
        ?string $displayName,
    ): ?object {
        return null; // no-op: Conversation giữ contact_id = NULL (Liên hệ nháp) đến Phase-07
    }

    public function mergeIdentities(
        string $workspaceId,
        string $primaryContactId,
        string $duplicateContactId,
    ): void {
        // no-op: Phase-07 impl flag needs_merge_review + audit log
    }
}
