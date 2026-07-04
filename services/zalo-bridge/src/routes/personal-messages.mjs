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

export function registerPersonalMessageRoutes(app, deps) {
    const { checkSendSecret, getSlot, bridgeSendTextOrMedia } = deps;

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
}
