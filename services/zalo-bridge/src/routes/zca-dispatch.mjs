/**
 * zca-dispatch.mjs — P11: 1 endpoint generic `POST /zca/:method` (JSON only)
 * thay hand-wire REST. Chỉ READ + action non-metered non-destructive;
 * send (409) / destructive (403 trừ elevated) / media (415) đi đường riêng.
 *
 * B1 (review BLOCKER-1): control CHÍNH là RLS `zalo_connections` phía Laravel
 * (call-site sai workspace không SELECT nổi connection_id). Token ở đây là
 * defense-in-depth: HMAC(connection_id + session_workspace) phải khớp
 * HMAC(connection_id + slot.workspaceId) — workspace bind lúc promote (P04),
 * KHÔNG derive từ connection row. Slot thiếu binding → 403 fail-closed.
 *
 * M2: resolve-only (404 nếu slot chưa login, KHÔNG get-or-create).
 * M3: timingSafeEqual mọi secret/token + rate-limit per-connection.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { buildAllowlist, invokeMethod } from '../zca-adapter.mjs';

const STATUS_BY_CODE = {
    METHOD_NOT_ALLOWED: 404,
    METHOD_DENIED: 403,
    OUTBOUND_USE_SEND_ENDPOINT: 409,
    DESTRUCTIVE_DENIED: 403,
    MEDIA_SPECIAL_ONLY: 415,
    FILE_REF_FORBIDDEN: 400,
    BAD_ARGS: 400,
    ARGS_TOO_LARGE: 413,
};

const RATE_LIMIT_MAX = 120;
const RATE_LIMIT_WINDOW_MS = 60000;

function safeEqual(a, b) {
    const ab = Buffer.from(String(a ?? ''));
    const bb = Buffer.from(String(b ?? ''));
    // length khác → so với chính mình để giữ thời gian gần-hằng, rồi từ chối
    if (ab.length !== bb.length) {
        timingSafeEqual(bb, bb);
        return false;
    }
    return timingSafeEqual(ab, bb);
}

/** Token B1: caller (Laravel) tính từ workspace của SESSION đã auth, bridge tính từ slot.workspaceId (bind lúc promote). */
export function workspaceToken(connectionId, workspaceId, secret) {
    return createHmac('sha256', String(secret)).update(`${connectionId}:${workspaceId}`).digest('hex');
}

export function registerZcaDispatchRoutes(app, { resolveSlot, sendSecret, elevatedSecret }) {
    const rateByConnection = new Map();

    function overRateLimit(connectionId) {
        const now = Date.now();
        const entry = rateByConnection.get(connectionId);
        if (!entry || now >= entry.resetAt) {
            rateByConnection.set(connectionId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
            return false;
        }
        entry.count++;
        return entry.count > RATE_LIMIT_MAX;
    }

    app.post('/zca/:method', async (req, res) => {
        // Fail-CLOSED: secret rỗng → từ chối (pattern checkSendSecret F10-audit)
        if (!sendSecret) {
            return res.status(503).json({ ok: false, error: 'bridge secret not configured' });
        }
        if (!safeEqual(req.header('X-Bridge-Send-Secret') || '', sendSecret)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }

        const connectionId = Number(req.body?.connection_id || 0);
        if (!Number.isFinite(connectionId) || connectionId <= 0) {
            return res.status(400).json({ ok: false, message: 'connection_id required' });
        }

        // M2: resolve-only — KHÔNG getSlot (auto-create phình Map + slot rỗng)
        const slot = resolveSlot(connectionId);
        if (!slot?.api || slot.loginPhase !== 'ready') {
            return res.status(404).json({ ok: false, message: 'slot_not_ready' });
        }

        // B1 token-từ-session: slot chưa bind workspace (promote cũ / chưa re-promote)
        // → fail-closed, dispatcher không dùng được cho tới khi re-promote.
        if (!slot.workspaceId) {
            return res.status(403).json({ ok: false, message: 'workspace_binding_missing' });
        }
        const expectedToken = workspaceToken(connectionId, slot.workspaceId, sendSecret);
        if (!safeEqual(req.body?.workspace_token || '', expectedToken)) {
            return res.status(403).json({ ok: false, message: 'workspace_token_mismatch' });
        }

        if (overRateLimit(connectionId)) {
            return res.status(429).json({ ok: false, message: 'rate_limited' });
        }

        // Elevated (39 destructive): secret RIÊNG, fail-closed khi chưa cấu hình.
        // Quyền THẬT gate ở Laravel (TenantPermission::ZaloDestructive, P10).
        const elevated =
            Boolean(elevatedSecret) && safeEqual(req.header('X-Bridge-Elevated-Secret') || '', elevatedSecret);

        slot.allowlist ??= buildAllowlist(slot.api);

        try {
            const result = await invokeMethod(slot.api, slot.allowlist, req.params.method, req.body?.args ?? [], {
                elevated,
            });
            return res.json({ ok: true, result });
        } catch (e) {
            const status = STATUS_BY_CODE[e?.code] || 500;
            return res.status(status).json({ ok: false, code: e?.code || 'ERR', message: String(e?.message || e) });
        }
    });
}
