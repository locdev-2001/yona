function recipientTypeToThreadType(rt) {
    if (rt == null || rt === '') {
        return null;
    }
    const s = String(rt).trim().toLowerCase();
    if (s === 'group' || s === '1') {
        return 1;
    }
    if (s === 'friend' || s === 'user' || s === '0') {
        return 0;
    }
    return null;
}

function resolveThreadFromItem(b) {
    if (!b || typeof b !== 'object') {
        return { thread_id: '', thread_type: null, err: 'invalid_item' };
    }
    let thread_id = b.thread_id != null ? String(b.thread_id).trim() : '';
    let thread_type = b.thread_type;
    if (!thread_id && b.recipient_id != null) {
        thread_id = String(b.recipient_id).trim();
    }
    const rtRaw = b.recipient_type != null ? String(b.recipient_type).trim().toLowerCase() : '';
    if (thread_type === undefined || thread_type === null || thread_type === '') {
        const mapped = recipientTypeToThreadType(rtRaw || 'friend');
        if (mapped === null) {
            return { thread_id: '', thread_type: null, err: 'recipient_type_invalid' };
        }
        thread_type = mapped;
    } else {
        const n = Number(thread_type);
        if (n !== 0 && n !== 1) {
            return { thread_id: '', thread_type: null, err: 'thread_type_invalid' };
        }
        thread_type = n;
    }
    if (!thread_id) {
        return { thread_id: '', thread_type: null, err: 'recipient_id_or_thread_id_required' };
    }
    return { thread_id, thread_type, err: null };
}

const BATCH_MAX_ITEMS = 100;

/**
 * Mã lỗi ỔN ĐỊNH cho lô 4 (Laravel): lõi rẽ nhánh theo `code`, không parse chữ.
 *   session_lost  — phiên Zalo chưa sẵn sàng/đã mất (khách quét lại QR)
 *   zalo_rejected — Zalo nhận yêu cầu rồi từ chối (tin quá cũ, không còn quyền…)
 *   bad_request   — tham số sai (lỗi của caller)
 *   unknown       — còn lại
 */
const ERROR_STATUS = {
    bad_request: 400,
    session_lost: 503,
    zalo_rejected: 502,
    unknown: 500,
};

function failWith(res, code, message) {
    return res.status(ERROR_STATUS[code] ?? 500).json({ ok: false, code, message: String(message ?? code) });
}

/** ZaloApiError đặt `name = 'ZcaApiError'` (Errors/ZaloApiError.js) — Zalo từ chối, không phải bug bridge. */
export function classifyZcaError(error) {
    const name = error?.name ? String(error.name) : '';
    if (name === 'ZcaApiError' || name === 'ZaloApiError') {
        return 'zalo_rejected';
    }
    return 'unknown';
}

/** `addReaction` trả `{msgIds: number[]}`; các lệnh khác chỉ trả `{status}`. */
export function firstSourceId(result) {
    const ids = result?.msgIds;
    if (Array.isArray(ids) && ids.length && ids[0] != null && String(ids[0]) !== '') {
        return String(ids[0]);
    }
    const single = result?.msgId ?? result?.msgID;
    return single != null && String(single) !== '' ? String(single) : null;
}

export function registerPersonalMessageRoutes(app, deps) {
    const { checkSendSecret, getSlot, resolveSlot, bridgeSendTextOrMedia, ThreadType, zcaReactionCode } = deps;

    // Thứ tự kiểm CÓ CHỦ Ý: tham số sai báo `bad_request` TRƯỚC, rồi mới tới trạng
    // thái phiên. Kiểm phiên trước thì mọi lỗi gọi sai của lõi đều bị che thành
    // `session_lost` và người sửa đi tìm nhầm chỗ.
    function connectionIdOrFail(req, res) {
        const connectionId = Number(req.body?.connection_id || 0);
        if (!Number.isFinite(connectionId) || connectionId <= 0) {
            failWith(res, 'bad_request', 'connection_id required');
            return null;
        }
        return connectionId;
    }

    // Resolve-only cho các cửa ra mới (M2 như dispatcher): không get-or-create,
    // slot chưa sẵn sàng là `session_lost` chứ không phải tạo slot rỗng.
    function readySlotOrFail(res, connectionId) {
        const slot = resolveSlot(connectionId);
        if (!slot?.api || slot.loginPhase !== 'ready') {
            failWith(res, 'session_lost', slot?.sessionLostReason || 'not_logged_in');
            return null;
        }
        return slot;
    }

    function threadOrFail(req, res) {
        const resolved = resolveThreadFromItem(req.body || {});
        if (resolved.err) {
            failWith(res, 'bad_request', resolved.err);
            return null;
        }
        return resolved;
    }

    function zcaThreadType(threadType) {
        return Number(threadType) === 1 ? ThreadType.Group : ThreadType.User;
    }

    function messageRefOrFail(req, res) {
        const msgId = String(req.body?.msg_id ?? '').trim();
        const cliMsgId = String(req.body?.cli_msg_id ?? '').trim();
        if (!msgId || !cliMsgId) {
            failWith(res, 'bad_request', 'msg_id and cli_msg_id required');
            return null;
        }
        return { msgId, cliMsgId };
    }

    app.post('/personal-messages/send', async (req, res) => {
        if (!checkSendSecret(req, res)) {
            return;
        }
        const connectionId = Number(req.body?.connection_id || 0);
        if (!connectionId) {
            return res.status(400).json({ ok: false, message: 'connection_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        const resolved = resolveThreadFromItem(req.body || {});
        if (resolved.err) {
            return res.status(400).json({ ok: false, message: resolved.err });
        }
        try {
            const out = await bridgeSendTextOrMedia(slot, {
                thread_id: resolved.thread_id,
                thread_type: resolved.thread_type,
                text: req.body?.text,
                file_url: req.body?.file_url,
                media_kind: req.body?.media_kind,
                filename: req.body?.filename,
                content_type: req.body?.content_type,
                quote: req.body?.quote,
                sticker: req.body?.sticker,
            });
            return res.json({
                ok: true,
                connection_id: connectionId,
                thread_id: resolved.thread_id,
                thread_type: resolved.thread_type,
                source_id: out.source_id,
                source_ids: out.source_ids ?? (out.source_id != null ? [out.source_id] : []),
            });
        } catch (e) {
            const msg = e?.message ? String(e.message) : String(e);
            if (
                msg === 'thread_id required' ||
                msg === 'thread_id and text or file_url required' ||
                msg === 'invalid media_kind'
            ) {
                return res.status(400).json({ ok: false, message: msg });
            }
            console.error('personal-messages/send', e);
            return res.status(500).json({ ok: false, message: msg });
        }
    });

    app.post('/personal-messages/send-batch', async (req, res) => {
        if (!checkSendSecret(req, res)) {
            return;
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        const delayMs = Math.max(0, Math.min(60000, Number(req.body?.delay_ms || 0) || 0));
        if (!connectionId) {
            return res.status(400).json({ ok: false, message: 'connection_id required' });
        }
        if (!items.length) {
            return res.status(400).json({ ok: false, message: 'items_required' });
        }
        if (items.length > BATCH_MAX_ITEMS) {
            return res.status(400).json({ ok: false, message: `items_max_${BATCH_MAX_ITEMS}` });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        const results = [];
        for (let i = 0; i < items.length; i++) {
            const it = items[i] || {};
            const resolved = resolveThreadFromItem(it);
            if (resolved.err) {
                results.push({ index: i, ok: false, message: resolved.err });
            } else {
                try {
                    const out = await bridgeSendTextOrMedia(slot, {
                        thread_id: resolved.thread_id,
                        thread_type: resolved.thread_type,
                        text: it.text,
                        file_url: it.file_url,
                        media_kind: it.media_kind,
                        filename: it.filename,
                        content_type: it.content_type,
                    });
                    results.push({
                        index: i,
                        ok: true,
                        thread_id: resolved.thread_id,
                        thread_type: resolved.thread_type,
                        source_id: out.source_id,
                    });
                } catch (e) {
                    const msg = e?.message ? String(e.message) : String(e);
                    results.push({ index: i, ok: false, message: msg });
                }
            }
            if (i < items.length - 1 && delayMs > 0) {
                await new Promise((r) => setTimeout(r, delayMs));
            }
        }
        const okCount = results.filter((r) => r.ok).length;
        return res.json({
            ok: true,
            connection_id: connectionId,
            sent_ok: okCount,
            sent_fail: results.length - okCount,
            results,
        });
    });

    // ── Cửa ra cho lõi: cảm xúc · thu hồi · đang gõ ──────────────────────────
    // Cùng secret gửi (`X-Bridge-Send-Secret`) với /send: đây đều là hành động
    // ghi ra tài khoản Zalo của khách.

    app.post('/personal-messages/reaction', async (req, res) => {
        if (!checkSendSecret(req, res)) {
            return;
        }
        const connectionId = connectionIdOrFail(req, res);
        if (!connectionId) {
            return;
        }
        const thread = threadOrFail(req, res);
        if (!thread) {
            return;
        }
        const ref = messageRefOrFail(req, res);
        if (!ref) {
            return;
        }
        // Mã lạ lọt xuống zca thành rType -1 = GỠ cảm xúc — nhầm lặng lẽ, phải chặn.
        const icon = zcaReactionCode(req.body?.icon);
        if (icon === null) {
            return failWith(res, 'bad_request', 'reaction_icon_unknown');
        }
        const slot = readySlotOrFail(res, connectionId);
        if (!slot) {
            return;
        }
        try {
            const out = await slot.api.addReaction(icon, {
                data: ref,
                threadId: thread.thread_id,
                type: zcaThreadType(thread.thread_type),
            });
            const sourceId = firstSourceId(out);
            return res.json({ ok: true, ...(sourceId ? { source_id: sourceId } : {}) });
        } catch (e) {
            const code = classifyZcaError(e);
            if (code === 'unknown') {
                console.error('personal-messages/reaction', e);
            }
            return failWith(res, code, e?.message || e);
        }
    });

    app.post('/personal-messages/undo', async (req, res) => {
        if (!checkSendSecret(req, res)) {
            return;
        }
        const connectionId = connectionIdOrFail(req, res);
        if (!connectionId) {
            return;
        }
        const thread = threadOrFail(req, res);
        if (!thread) {
            return;
        }
        const ref = messageRefOrFail(req, res);
        if (!ref) {
            return;
        }
        const slot = readySlotOrFail(res, connectionId);
        if (!slot) {
            return;
        }
        try {
            // `undo` = thu hồi với MỌI người. `deleteMessage` là xoá phía mình và
            // nó ném thẳng "use undo api instead" với tin của chính mình
            // (apis/deleteMessage.js) — không phải thứ lõi cần.
            const out = await slot.api.undo(ref, thread.thread_id, zcaThreadType(thread.thread_type));
            const sourceId = firstSourceId(out);
            return res.json({ ok: true, ...(sourceId ? { source_id: sourceId } : {}) });
        } catch (e) {
            const code = classifyZcaError(e);
            if (code === 'unknown') {
                console.error('personal-messages/undo', e);
            }
            return failWith(res, code, e?.message || e);
        }
    });

    app.post('/personal-messages/typing', async (req, res) => {
        if (!checkSendSecret(req, res)) {
            return;
        }
        const connectionId = connectionIdOrFail(req, res);
        if (!connectionId) {
            return;
        }
        const thread = threadOrFail(req, res);
        if (!thread) {
            return;
        }
        const slot = readySlotOrFail(res, connectionId);
        if (!slot) {
            return;
        }
        try {
            await slot.api.sendTypingEvent(thread.thread_id, zcaThreadType(thread.thread_type));
            return res.json({ ok: true });
        } catch (e) {
            const code = classifyZcaError(e);
            if (code === 'unknown') {
                console.error('personal-messages/typing', e);
            }
            return failWith(res, code, e?.message || e);
        }
    });
}
