import { deepThreadBackfill, requestThreadBackfill } from '../reconnect-backfill.mjs';

/** Base Zalo id for matching find-user / sent list / incoming list (strip suffix, segment before _). */
function normalizeZaloFidKey(id) {
    const s = String(id || '').trim();
    if (!s) return '';
    return s.replace(/_0$/i, '').split('_')[0] || s;
}

/**
 * Incoming friend requests from getFriendRecommendations (same rules as GET /ui/friend-requests).
 * @returns {Array<{user_id: string, name: string|null, avatar: string|null, message: string|null, time: *}>}
 */
function parseIncomingFriendRequestsFromRecommendations(rec) {
    const mergeProfile = (r) => {
        if (!r || typeof r !== 'object') return r;
        const p = r.profile || r.userInfo || r.user_info || r.user || r.account || r.zinfo;
        if (p && typeof p === 'object') {
            return { ...p, ...r };
        }
        return r;
    };

    const pickZaloUserId = (r) => {
        const x = mergeProfile(r);
        const raw = String(
            x.fromUid ||
            x.senderUid ||
            x.userId ||
                x.uid ||
                x.id ||
                x.user_id ||
                x.zaloid ||
                x.zaloId ||
                x.globalId ||
                ''
        ).trim();
        return raw.replace(/_0$/, '') || raw;
    };

    const asType = (x) => {
        if (!x || typeof x !== 'object') return 0;
        const v = x.recommType ??
            x.recomm_type ??
            x.type ??
            x.recommendType ??
            x.recType ??
            x.friendRequestType ??
            x.rec_type ??
            x.recommend_type ??
            x.recommItemType;
        if (v == null || v === '') return 0;
        const n = Number(v);
        if (!Number.isNaN(n) && n !== 0) return n;
        if (typeof v === 'string') {
            const sl = v.toLowerCase();
            if (sl.includes('request') || sl.includes('recv') || sl.includes('incoming')) return 2;
            if (sl.includes('recommend') || sl.includes('suggest')) return 1;
        }
        return 0;
    };

    const hasRequestEnvelope = (x) => {
        if (!x || typeof x !== 'object') return false;
        if (x.fReqInfo && typeof x.fReqInfo === 'object') return true;
        if (x.recvFReq && typeof x.recvFReq === 'object') return true;
        if (x.friendReq && typeof x.friendReq === 'object') return true;
        return false;
    };

    const walkInheritedTypes = (node, depth, ancTypes, acc) => {
        if (node == null || depth <= 0) return;
        if (Array.isArray(node)) {
            for (const x of node) walkInheritedTypes(x, depth - 1, ancTypes, acc);
            return;
        }
        if (typeof node !== 'object') return;
        const selfT = asType(node);
        const nextAnc = selfT > 0 ? [...ancTypes, selfT] : [...ancTypes];
        const inherited = nextAnc.length ? Math.max(...nextAnc) : 0;
        acc.push({ obj: node, inherited });
        for (const v of Object.values(node)) {
            walkInheritedTypes(v, depth - 1, nextAnc, acc);
        }
    };

    const tagged = [];
    walkInheritedTypes(rec, 12, [], tagged);

    const isIncomingFriendRequestRow = ({ obj, inherited }) => {
        if (!obj || typeof obj !== 'object') return false;
        const selfT = asType(obj);
        if (selfT === 1 || inherited === 1) return false;
        if (selfT === 2 || inherited === 2) return true;
        if (hasRequestEnvelope(obj) && selfT !== 1) return true;
        return false;
    };

    let rows = tagged
        .filter((t) => isIncomingFriendRequestRow(t))
        .map((t) => t.obj);

    if (!rows.length) {
        rows = tagged
            .filter(({ obj, inherited }) => {
                if (!obj || typeof obj !== 'object') return false;
                if (asType(obj) === 1 || inherited === 1) return false;
                const id = pickZaloUserId(obj);
                if (!id || id.length < 4) return false;
                if (hasRequestEnvelope(obj)) return true;
                if (obj.fromUid || obj.senderUid) return true;
                return false;
            })
            .map((t) => t.obj);
    }

    const pickReqName = (r) => {
        const x = mergeProfile(r);
        return (
            x.displayName ||
            x.zaloName ||
            x.dName ||
            x.name ||
            x.display_name ||
            x.zalo_name ||
            null
        );
    };

    const seen = new Set();
    const out = [];
    const pushRow = (user_id, name, avatar, message, time) => {
        const uid = String(user_id || '').trim().replace(/_0$/, '');
        if (!uid || uid.length < 4) return;
        const dedupeKey = normalizeZaloFidKey(uid);
        if (!dedupeKey || seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        out.push({
            user_id: uid,
            name: name || null,
            avatar: avatar || null,
            message: message || null,
            time: time ?? null,
        });
    };

    const isIncomingRecommItem = (item) => {
        const di = item?.dataInfo;
        if (!di || typeof di !== 'object') return false;
        const rt = Number(di.recommType ?? di.recomm_type ?? 0);
        const rit = Number(item.recommItemType ?? item.recomm_item_type ?? 0);
        if (rt === 1 || rit === 1) return false;
        if (rt === 2 || rit === 2) return true;
        const msg = di.recommInfo?.message || di.recommInfo?.customText;
        if (msg && di.isSeenFriendReq !== true) return true;
        if ((rt === 0 || Number.isNaN(rt)) && (rit === 0 || Number.isNaN(rit)) && msg) return true;
        return false;
    };

    if (Array.isArray(rec?.recommItems)) {
        for (const item of rec.recommItems) {
            if (!isIncomingRecommItem(item)) continue;
            const di = item.dataInfo;
            const uid = String(di.userId ?? di.uid ?? di.globalId ?? '').trim();
            const msg = di.recommInfo?.message || di.recommInfo?.customText || null;
            const t = di.recommTime ?? di.recomm_time ?? null;
            pushRow(
                uid,
                di.displayName || di.zaloName || null,
                di.avatar || null,
                msg,
                t
            );
        }
    }

    for (const r of rows) {
        const user_id = pickZaloUserId(r);
        const m = mergeProfile(r);
        pushRow(
            user_id,
            pickReqName(r),
            m.avatar || m.avt || m.fullAvt || null,
            r?.message || r?.fReqInfo?.message || r?.recommInfo?.message || r?.reqMsg || r?.req_message || r?.content || r?.msg || null,
            r?.time || r?.fReqInfo?.time || r?.recommTime || r?.createdTime || r?.created_time || null
        );
    }

    return out;
}

export function registerUiActionsRoutes(app, deps) {
    const {
        checkUiSecret,
        getSlot,
        ThreadType,
        buildGroupBackfillPayload,
        enqueueOutbox,
    } = deps;

    const cache = new Map();
    const inflight = new Map();
    const nowMs = () => Date.now();
    const cacheGet = (key) => {
        const v = cache.get(key);
        if (!v) return null;
        if (v.expiresAt <= nowMs()) {
            cache.delete(key);
            return null;
        }
        return v.value;
    };
    const cacheSet = (key, value, ttlMs) => {
        cache.set(key, { value, expiresAt: nowMs() + ttlMs });
    };
    const invalidateFriendsCache = (connectionId) => {
        const id = Number(connectionId);
        if (id) cache.delete(`friends:${id}`);
    };
    const invalidateGroupsCache = (connectionId) => {
        const id = Number(connectionId);
        if (id) cache.delete(`groups:${id}`);
    };
    const errInfo = (e) => {
        const msg = e?.message ? String(e.message) : String(e);
        const status = Number(e?.response?.status || e?.status || 0) || null;
        const isRateLimited =
            status === 429 ||
            msg.includes(" 429") ||
            msg.includes("status code 429") ||
            msg.includes("Retry limit");
        const isInvalidParam = msg.includes("Tham số không hợp lệ");
        return { msg, status, isRateLimited, isInvalidParam };
    };

    app.get('/ui/friends', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.query?.connection_id || 0);
        if (!connectionId) {
            return res.status(400).json({ ok: false, message: 'connection_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        const key = `friends:${connectionId}`;
        const cached = cacheGet(key);
        if (cached) {
            return res.json({ ok: true, friends: cached, cached: true });
        }
        if (inflight.has(key)) {
            try {
                const v = await inflight.get(key);
                return res.json({ ok: true, friends: v, cached: true });
            } catch (e) {
                const info = errInfo(e);
                return res.status(info.isRateLimited ? 429 : 500).json({ ok: false, message: info.msg });
            }
        }
        try {
            const p = (async () => {
                const friends = await slot.api.getAllFriends(2000, 1);
                const out = Array.isArray(friends)
                ? friends.map((u) => ({
                      id: String(u.userId ?? u.uid ?? u.id ?? ''),
                      name: u.displayName || u.zaloName || u.dName || null,
                      avatar: u.avatar || null,
                      phone: u.phoneNumber || u.phone_number || null,
                  }))
                : [];
                const cleaned = out.filter((x) => x.id);
                cacheSet(key, cleaned, 60_000);
                return cleaned;
            })();
            inflight.set(key, p);
            const out = await p;
            inflight.delete(key);
            return res.json({ ok: true, friends: out });
        } catch (e) {
            inflight.delete(key);
            const info = errInfo(e);
            const status = info.isRateLimited ? 429 : (info.isInvalidParam ? 422 : 500);
            return res.status(status).json({ ok: false, message: info.msg });
        }
    });

    app.get('/ui/friend-requests', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.query?.connection_id || 0);
        if (!connectionId) {
            return res.status(400).json({ ok: false, message: 'connection_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const rec = await slot.api.getFriendRecommendations();
            if (process.env.ZALO_BRIDGE_DEBUG_FRIEND_REQUESTS === '1') {
                try {
                    const s = JSON.stringify(rec);
                    console.log('[ui/friend-requests] raw keys', rec && typeof rec === 'object' ? Object.keys(rec) : typeof rec);
                    console.log('[ui/friend-requests] raw (truncated)', s.length > 12000 ? `${s.slice(0, 12000)}…` : s);
                } catch (_e) {
                    console.log('[ui/friend-requests] raw (unserializable)');
                }
            }

            const out = parseIncomingFriendRequestsFromRecommendations(rec);
            return res.json({ ok: true, friend_requests: out });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    const normalizePhone = (raw) => {
        let s = String(raw || '').trim();
        s = s.replace(/[^0-9+]/g, '');
        if (s.startsWith('+84')) {
            s = `84${s.slice(3)}`;
        }
        if (s.startsWith('0') && s.length >= 9) {
            s = `84${s.slice(1)}`;
        }
        s = s.replace(/[^0-9]/g, '');
        return s;
    };

    app.get('/ui/find-user', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.query?.connection_id || 0);
        const phone = normalizePhone(req.query?.phone);
        if (!connectionId || !phone) {
            return res.status(400).json({ ok: false, message: 'connection_id and phone required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const u = await slot.api.findUser(phone);
            const pick = (obj, path, fallback = null) => {
                try {
                    return path.split('.').reduce((a, k) => (a && a[k] != null ? a[k] : null), obj) ?? fallback;
                } catch (_e) {
                    return fallback;
                }
            };
            const pickName = (obj) => (
                obj?.displayName ||
                obj?.zaloName ||
                obj?.dName ||
                obj?.display_name ||
                obj?.zalo_name ||
                pick(obj, 'data.displayName') ||
                pick(obj, 'data.zaloName') ||
                pick(obj, 'data.dName') ||
                pick(obj, 'data.display_name') ||
                pick(obj, 'data.zalo_name') ||
                pick(obj, 'userInfo.displayName') ||
                pick(obj, 'user_info.displayName') ||
                null
            );
            const pickAvatar = (obj) => (
                obj?.avatar ||
                pick(obj, 'data.avatar') ||
                pick(obj, 'userInfo.avatar') ||
                null
            );
            const uid = String(u.userId ?? u.uid ?? u.id ?? '').trim();
            let name = pickName(u);
            let avatar = pickAvatar(u);
            if (uid && !name) {
                try {
                    const prof = await slot.api.getUserInfo(uid);
                    const uidBase = uid.split('_')[0];
                    const rows = [];
                    const walkProf = (obj, depth) => {
                        if (!obj || depth <= 0) return;
                        if (Array.isArray(obj)) {
                            for (const x of obj) walkProf(x, depth - 1);
                            return;
                        }
                        if (typeof obj === 'object') {
                            const idRaw = String(obj.userId ?? obj.uid ?? obj.user_id ?? '').trim();
                            const idBase = idRaw.split('_')[0];
                            if (
                                idBase &&
                                (obj.display_name || obj.displayName || obj.zalo_name || obj.zaloName)
                            ) {
                                rows.push(obj);
                            }
                            for (const v of Object.values(obj)) walkProf(v, depth - 1);
                        }
                    };
                    walkProf(prof, 8);
                    const row =
                        rows.find((r) => {
                            const idRaw = String(r.userId ?? r.uid ?? r.user_id ?? '').trim();
                            return idRaw.split('_')[0] === uidBase;
                        }) || rows[0];
                    if (row) {
                        name = pickName(row) || name;
                        avatar = pickAvatar(row) || row.avatar || avatar;
                    }
                } catch (_e) {
                    /* keep findUser fields */
                }
            }
            let status = null;
            if (uid) {
                const fid = uid.includes('_') ? uid : `${uid.replace(/_0$/, '')}_0`;
                try {
                    status = await slot.api.getFriendRequestStatus(fid);
                } catch (_e) {
                    try {
                        status = await slot.api.getFriendRequestStatus(uid.replace(/_0$/, ''));
                    } catch (_e2) {
                        status = null;
                    }
                }
            }
            // reqstatus: is_requested = we sent / pending their accept; is_requesting = they sent / pending ours.
            // (Easy to read backwards; older bridge used the opposite mapping.)
            const legacyInvert = process.env.ZALO_BRIDGE_SWAP_REQ_STATUS === '1';
            const rawRequested = Number(status?.is_requested ?? 0) === 1;
            const rawRequesting = Number(status?.is_requesting ?? 0) === 1;
            const isFriend = Number(status?.is_friend ?? 0) === 1;
            const incoming_to_me = legacyInvert ? rawRequested : rawRequesting;
            const outgoing_from_me = legacyInvert ? rawRequesting : rawRequested;

            // Align pending_* with status / status_norm only (extra lists mislabeled some UIDs as "sent").
            let pending_outgoing_request = false;
            let pending_incoming_request = false;
            if (status && typeof status === 'object' && !isFriend) {
                pending_outgoing_request = outgoing_from_me;
                pending_incoming_request = incoming_to_me && !outgoing_from_me;
            }

            return res.json({
                ok: true,
                user: {
                    id: uid,
                    name,
                    avatar,
                },
                status,
                status_norm: status && typeof status === 'object'
                    ? {
                        is_friend: isFriend,
                        incoming_to_me,
                        outgoing_from_me,
                    }
                    : null,
                pending_outgoing_request,
                pending_incoming_request,
            });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.post('/ui/add-friend', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const phone = normalizePhone(req.body?.phone);
        const message = String(req.body?.message || '');
        if (!connectionId || !phone) {
            return res.status(400).json({ ok: false, message: 'connection_id and phone required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const u = await slot.api.findUser(phone);
            const uid = String(u.userId ?? u.uid ?? u.id ?? '').trim();
            if (!uid) {
                return res.status(400).json({ ok: false, message: 'user_not_found' });
            }
            await slot.api.sendFriendRequest(message || '', uid);
            return res.json({ ok: true, user_id: uid });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.get('/ui/groups', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.query?.connection_id || 0);
        if (!connectionId) {
            return res.status(400).json({ ok: false, message: 'connection_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        const key = `groups:${connectionId}`;
        const cached = cacheGet(key);
        if (cached) {
            return res.json({ ok: true, groups: cached, cached: true });
        }
        if (inflight.has(key)) {
            try {
                const v = await inflight.get(key);
                return res.json({ ok: true, groups: v, cached: true });
            } catch (e) {
                const info = errInfo(e);
                return res.status(info.isRateLimited ? 429 : 500).json({ ok: false, message: info.msg });
            }
        }
        try {
            const p = (async () => {
                const all = await slot.api.getAllGroups();
                const verMap = all?.gridVerMap && typeof all.gridVerMap === 'object' ? all.gridVerMap : null;
                const ids = verMap ? Object.keys(verMap) : [];
                if (!ids.length) {
                    if (Array.isArray(all)) {
                        const out = all
                            .map((g) => ({
                                id: String(g.groupId || g.id || ''),
                                name: g.name || null,
                                avatar: g.fullAvt || g.avt || g.avatar || null,
                                total_member: g.totalMember ?? g.total_member ?? null,
                            }))
                            .filter((x) => x.id);
                        out.sort((a, b) => {
                            try {
                                const da = BigInt(a.id);
                                const db = BigInt(b.id);
                                if (db > da) return 1;
                                if (db < da) return -1;
                            } catch (_e) {
                                /* ignore */
                            }
                            return 0;
                        });
                        cacheSet(key, out, 60_000);
                        return out;
                    }
                    cacheSet(key, [], 30_000);
                    return [];
                }
                const uniqIds = Array.from(new Set(ids.map((x) => String(x).trim()).filter(Boolean)));
                uniqIds.sort((a, b) => {
                    const va = Number(verMap[a]);
                    const vb = Number(verMap[b]);
                    const fa = Number.isFinite(va);
                    const fb = Number.isFinite(vb);
                    if (fa && fb && vb !== va) return vb - va;
                    if (fa && !fb) return -1;
                    if (!fa && fb) return 1;
                    return 0;
                });
                const safeFetchInfo = async (chunk) => {
                    const gi = await slot.api.getGroupInfo(chunk);
                    const map = gi?.gridInfoMap && typeof gi.gridInfoMap === 'object' ? gi.gridInfoMap : {};
                    return map;
                };
                const chunked = (arr, n) => {
                    const out = [];
                    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
                    return out;
                };

                const merged = {};
                const trySizes = [50, 10, 1];
                for (const size of trySizes) {
                    const remaining = uniqIds.filter((gid) => merged[gid] == null);
                    if (!remaining.length) break;
                    for (const part of chunked(remaining, size)) {
                        try {
                            const map = await safeFetchInfo(part);
                            for (const [gid, info] of Object.entries(map)) {
                                merged[String(gid)] = info;
                            }
                        } catch (e) {
                            const info = errInfo(e);
                            // If invalid param, retry with smaller chunks in next loop
                            if (info.isInvalidParam) {
                                continue;
                            }
                            // Rate limited or other errors: bubble up
                            throw e;
                        }
                    }
                }

                const out = uniqIds.map((gid) => {
                    const info = merged[gid] || null;
                    return {
                        id: String(gid),
                        name: info?.name ? String(info.name) : String(gid),
                        avatar: info?.fullAvt || info?.avt || null,
                        total_member: info?.totalMember ?? null,
                    };
                }).filter((x) => x.id);
                cacheSet(key, out, 60_000);
                return out;
            })();
            inflight.set(key, p);
            const out = await p;
            inflight.delete(key);
            return res.json({ ok: true, groups: out });
        } catch (e) {
            inflight.delete(key);
            const info = errInfo(e);
            const status = info.isRateLimited ? 429 : (info.isInvalidParam ? 422 : 500);
            return res.status(status).json({ ok: false, message: info.msg });
        }
    });

    const attachmentFromUrl = async (url) => {
        let u = String(url || '').trim();
        if (!u) return null;
        // Allow relative URLs returned by Laravel upload (e.g. "/storage/...")
        if (u.startsWith('/')) {
            const base = String(process.env.LARAVEL_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
            u = base + u;
        }
        // Normalize localhost to IPv4 loopback for fetch stability
        u = u.replace(/^http:\/\/localhost(?=[:\/]|$)/i, 'http://127.0.0.1');
        u = u.replace(/^https:\/\/localhost(?=[:\/]|$)/i, 'https://127.0.0.1');
        if (!/^https?:\/\//i.test(u)) return null;
        try {
            const urlObj = new URL(u);
            const isLocal = (urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost' || urlObj.hostname === '0.0.0.0');
            if (isLocal && urlObj.pathname.startsWith('/storage/')) {
                const path = (await import('path')).default;
                const fs = await import('fs/promises');
                // bridge runs at plugins/zalo-personal-bridge/
                const root = path.resolve(process.cwd(), '..', '..');
                const fp = path.join(root, 'public', urlObj.pathname.replace(/^\/+/, ''));
                const data = await fs.readFile(fp);
                if (!data?.length) {
                    throw new Error(`empty_avatar file=${fp}`);
                }
                // ponytail: AttachmentSource requires filename + totalSize (zca-js 2.1.2)
                return { data, filename: 'avatar.jpg', metadata: { totalSize: data.length } };
            }
        } catch {
            // ignore and fallback to fetch
        }
        const isLocal =
            u.startsWith('http://127.0.0.1') ||
            u.startsWith('http://localhost') ||
            u.startsWith('http://0.0.0.0');
        let r;
        const fetchOnce = async (timeoutMs) => {
            const ac = new AbortController();
            const t = setTimeout(() => ac.abort(), timeoutMs);
            try {
                return await fetch(u, { signal: ac.signal });
            } finally {
                clearTimeout(t);
            }
        };
        try {
            // Local Laravel storage can be slow (large webp) -> allow longer timeout.
            r = await fetchOnce(isLocal ? 45_000 : 12_000);
        } catch (e) {
            if (isLocal) {
                // one retry for local
                try {
                    r = await fetchOnce(45_000);
                } catch (e2) {
                    throw new Error(`failed_to_fetch_avatar: network_error: ${String(e2?.message || e2)} url=${u}`);
                }
            } else {
                throw new Error(`failed_to_fetch_avatar: network_error: ${String(e?.message || e)} url=${u}`);
            }
        }
        if (!r.ok) {
            throw new Error(`failed_to_fetch_avatar: ${r.status} url=${u}`);
        }
        const ab = await r.arrayBuffer();
        const data = Buffer.from(ab);
        if (!data.length) {
            throw new Error(`empty_avatar url=${u}`);
        }
        // ponytail: AttachmentSource requires filename + totalSize (zca-js 2.1.2)
        return {
            data,
            filename: 'avatar.jpg',
            metadata: {
                totalSize: data.length,
            },
        };
    };

    app.post('/ui/create-group', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const name = String(req.body?.name || '').trim();
        const members = Array.isArray(req.body?.members) ? req.body.members.map((v) => String(v).trim()).filter(Boolean) : [];
        const avatarUrl = String(req.body?.avatar_url || '').trim();
        if (!connectionId || members.length < 2) {
            return res.status(400).json({ ok: false, message: 'connection_id and at least 2 members required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const result = await slot.api.createGroup({
                name: name || undefined,
                members,
            });
            let avatar_updated = false;
            if (avatarUrl && result?.groupId) {
                const avatarSource = await attachmentFromUrl(avatarUrl);
                if (avatarSource) {
                    await slot.api.changeGroupAvatar(avatarSource, String(result.groupId));
                    avatar_updated = true;
                }
            }
            invalidateGroupsCache(connectionId);
            return res.json({
                ok: true,
                group: result,
                avatar_pending: false,
                avatar_updated,
            });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.post('/ui/friend-requests/accept', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const userId = String(req.body?.user_id || '').trim();
        if (!connectionId || !userId) {
            return res.status(400).json({ ok: false, message: 'connection_id and user_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            await slot.api.acceptFriendRequest(userId);
            invalidateFriendsCache(connectionId);
            return res.json({ ok: true });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.post('/ui/friend-requests/reject', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const userId = String(req.body?.user_id || '').trim();
        if (!connectionId || !userId) {
            return res.status(400).json({ ok: false, message: 'connection_id and user_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            await slot.api.rejectFriendRequest(userId);
            invalidateFriendsCache(connectionId);
            return res.json({ ok: true });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.post('/ui/send-message', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const peerId = String(req.body?.peer_id || '').trim();
        const threadType = Number(req.body?.thread_type || 0);
        const message = String(req.body?.message || '').trim();
        if (!connectionId || !peerId || !message) {
            return res.status(400).json({ ok: false, message: 'connection_id, peer_id, message required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const tt = threadType === 1 ? ThreadType.Group : ThreadType.User;
            const payload = { msg: message };
            const result = await slot.api.sendMessage(payload, peerId, tt);
            return res.json({ ok: true, result });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.get('/ui/group-info', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.query?.connection_id || 0);
        const groupId = String(req.query?.group_id || '').trim();
        if (!connectionId || !groupId) {
            return res.status(400).json({ ok: false, message: 'connection_id and group_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        const debug = String(req.query?.debug || '').trim() === '1';
        try {
            const gi = await slot.api.getGroupInfo(groupId);
            const map = gi?.gridInfoMap && typeof gi.gridInfoMap === 'object' ? gi.gridInfoMap : {};
            const info = map[groupId] || map[String(groupId)] || Object.values(map)[0] || null;
            if (!info) {
                return res.status(404).json({ ok: false, message: 'group_not_found' });
            }
            return res.json({
                ok: true,
                group: {
                    id: String(info.groupId || groupId),
                    name: info.name || null,
                    avatar: info.fullAvt || info.avt || null,
                    desc: info.desc || null,
                    total_member: info.totalMember ?? null,
                    max_member: info.maxMember ?? null,
                    creator_id: info.creatorId || null,
                    admin_ids: Array.isArray(info.adminIds) ? info.adminIds : [],
                    member_ids: Array.isArray(info.memberIds) ? info.memberIds : [],
                    current_mems: Array.isArray(info.currentMems) ? info.currentMems : [],
                    setting: info.setting || null,
                    ...(debug
                        ? {
                            debug: {
                                info_keys: info && typeof info === 'object' ? Object.keys(info).slice(0, 80) : [],
                                memberIds_len: Array.isArray(info.memberIds) ? info.memberIds.length : null,
                                currentMems_len: Array.isArray(info.currentMems) ? info.currentMems.length : null,
                                updateMems_len: Array.isArray(info.updateMems) ? info.updateMems.length : null,
                                memVerList_len: Array.isArray(info.memVerList) ? info.memVerList.length : null,
                                members_len: Array.isArray(info.members) ? info.members.length : null,
                                memIds_len: Array.isArray(info.memIds) ? info.memIds.length : null,
                                member_ids_len: Array.isArray(info.member_ids) ? info.member_ids.length : null,
                            },
                        }
                        : {}),
                },
            });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.get('/ui/group-members', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.query?.connection_id || 0);
        const groupId = String(req.query?.group_id || '').trim();
        if (!connectionId || !groupId) {
            return res.status(400).json({ ok: false, message: 'connection_id and group_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        const debug = String(req.query?.debug || '').trim() === '1';
        try {
            const gi = await slot.api.getGroupInfo(groupId);
            const map = gi?.gridInfoMap && typeof gi.gridInfoMap === 'object' ? gi.gridInfoMap : {};
            const info = map[groupId] || map[String(groupId)] || Object.values(map)[0] || null;
            if (!info) {
                return res.status(404).json({ ok: false, message: 'group_not_found' });
            }
            const adminSet = new Set(Array.isArray(info.adminIds) ? info.adminIds.map(String) : []);
            const creatorId = String(info.creatorId || '');
            const normId = (s) => {
                const x = String(s || '').trim();
                return x.endsWith('_0') ? x.slice(0, -2) : x;
            };
            const extractIds = (arr) => {
                if (!Array.isArray(arr)) return [];
                const out = [];
                for (const it of arr) {
                    if (it == null) continue;
                    if (typeof it === 'string' || typeof it === 'number') {
                        const s = normId(it);
                        if (s) out.push(s);
                        continue;
                    }
                    if (typeof it === 'object') {
                        const s = normId(it.id ?? it.userId ?? it.uid ?? it.memberId ?? '');
                        if (s) out.push(s);
                    }
                }
                return out;
            };

            let memberIds = Array.isArray(info.memberIds) ? info.memberIds.map(normId).filter(Boolean) : [];
            if (!memberIds.length) {
                const mems = Array.isArray(info.currentMems) ? info.currentMems : [];
                memberIds = mems.map((m) => normId(m?.id || '')).filter(Boolean);
            }
            if (!memberIds.length) {
                memberIds = extractIds(info.updateMems);
            }
            if (!memberIds.length) {
                memberIds = extractIds(info.memVerList);
            }

            if (debug && !memberIds.length) {
                return res.json({
                    ok: true,
                    members: [],
                    debug: {
                        info_keys: info && typeof info === 'object' ? Object.keys(info).slice(0, 80) : [],
                        memberIds_len: Array.isArray(info.memberIds) ? info.memberIds.length : null,
                        currentMems_len: Array.isArray(info.currentMems) ? info.currentMems.length : null,
                        updateMems_len: Array.isArray(info.updateMems) ? info.updateMems.length : null,
                        memVerList_len: Array.isArray(info.memVerList) ? info.memVerList.length : null,
                        members_len: Array.isArray(info.members) ? info.members.length : null,
                        memIds_len: Array.isArray(info.memIds) ? info.memIds.length : null,
                        member_ids_len: Array.isArray(info.member_ids) ? info.member_ids.length : null,
                    },
                });
            }

            // currentMems is often empty/partial; fetch full profiles by memberIds
            const chunks = [];
            const chunkSize = 50;
            for (let i = 0; i < memberIds.length; i += chunkSize) {
                chunks.push(memberIds.slice(i, i + chunkSize));
            }
            const profiles = [];
            for (const ids of chunks) {
                try {
                    // ponytail: 2.1.2 signature is (memberId) — no groupId arg; returns { profiles: { [id]: GroupMemberProfile } }
                    const r = await slot.api.getGroupMembersInfo(ids);
                    const profilesMap = r?.profiles && typeof r.profiles === 'object' ? r.profiles : {};
                    const arr = Object.values(profilesMap);
                    profiles.push(...arr);
                } catch {
                    // ignore chunk errors, keep best-effort
                }
            }

            const byId = new Map();
            for (const p of profiles) {
                // GroupMemberProfile 2.1.2: id, displayName, zaloName, avatar
                const id = String(p?.id || p?.uid || p?.userId || '').trim();
                if (!id) continue;
                byId.set(id, {
                    id,
                    name: p?.displayName || p?.zaloName || p?.dName || p?.name || null,
                    avatar: p?.avatar || p?.avatarUrl || p?.avt || null,
                });
            }

            // fallback to currentMems for any missing profiles
            const mems = Array.isArray(info.currentMems) ? info.currentMems : [];
            for (const m of mems) {
                const id = String(m?.id || '').trim();
                if (!id || byId.has(id)) continue;
                byId.set(id, {
                    id,
                    name: m?.dName || m?.zaloName || null,
                    avatar: m?.avatar || null,
                });
            }

            // extra fallback: fetch user profiles individually when still missing
            const pickName = (obj) => (
                obj?.displayName ||
                obj?.zaloName ||
                obj?.dName ||
                obj?.display_name ||
                obj?.zalo_name ||
                null
            );
            const pickAvatar = (obj) => (
                obj?.avatar ||
                obj?.avatarUrl ||
                obj?.avt ||
                null
            );
            const resolveFromProfile = (prof, uidBase) => {
                const rows = [];
                const walk = (obj, depth) => {
                    if (!obj || depth <= 0) return;
                    if (Array.isArray(obj)) {
                        for (const x of obj) walk(x, depth - 1);
                        return;
                    }
                    if (typeof obj === 'object') {
                        const idRaw = String(obj.userId ?? obj.uid ?? obj.user_id ?? '').trim();
                        const idBase = idRaw.split('_')[0];
                        if (idBase && (obj.displayName || obj.display_name || obj.zaloName || obj.zalo_name || obj.dName)) {
                            rows.push(obj);
                        }
                        for (const v of Object.values(obj)) walk(v, depth - 1);
                    }
                };
                walk(prof, 8);
                const row = rows.find((r) => {
                    const idRaw = String(r.userId ?? r.uid ?? r.user_id ?? '').trim();
                    return idRaw.split('_')[0] === uidBase;
                }) || rows[0] || null;
                if (!row) return null;
                return { name: pickName(row) || null, avatar: pickAvatar(row) || null };
            };
            for (const id of memberIds) {
                const base = byId.get(String(id)) || { id: String(id), name: null, avatar: null };
                if (base.name && base.avatar) continue;
                try {
                    const prof = await slot.api.getUserInfo(String(id));
                    const resolved = resolveFromProfile(prof, String(id).split('_')[0]);
                    if (resolved && (resolved.name || resolved.avatar)) {
                        byId.set(String(id), {
                            id: String(id),
                            name: resolved.name || base.name || null,
                            avatar: resolved.avatar || base.avatar || null,
                        });
                    }
                } catch {
                    // ignore, keep best-effort
                }
            }

            const members = memberIds.map((id) => {
                const base = byId.get(String(id)) || { id: String(id), name: null, avatar: null };
                const role =
                    creatorId && String(base.id) === creatorId
                        ? 'owner'
                        : (adminSet.has(String(base.id)) ? 'admin' : 'member');
                return { ...base, role };
            }).filter((x) => x.id);

            return res.json({ ok: true, members, creator_id: creatorId || null });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.post('/ui/group-members/add-deputy', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const groupId = String(req.body?.group_id || '').trim();
        const memberId = String(req.body?.member_id || '').trim();
        if (!connectionId || !groupId || !memberId) {
            return res.status(400).json({ ok: false, message: 'connection_id, group_id and member_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const api = slot.api;
            if (typeof api.addGroupDeputy !== 'function') {
                return res.status(500).json({ ok: false, message: 'add_group_deputy_not_supported' });
            }
            const result = await api.addGroupDeputy(memberId, groupId);
            return res.json({ ok: true, result });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.post('/ui/group-members/remove-deputy', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const groupId = String(req.body?.group_id || '').trim();
        const memberId = String(req.body?.member_id || '').trim();
        if (!connectionId || !groupId || !memberId) {
            return res.status(400).json({ ok: false, message: 'connection_id, group_id and member_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const api = slot.api;
            if (typeof api.removeGroupDeputy !== 'function') {
                return res.status(500).json({ ok: false, message: 'remove_group_deputy_not_supported' });
            }
            const result = await api.removeGroupDeputy(memberId, groupId);
            return res.json({ ok: true, result });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.post('/ui/group-members/add', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const groupId = String(req.body?.group_id || '').trim();
        const memberIds = Array.isArray(req.body?.member_ids)
            ? req.body.member_ids.map((v) => String(v).trim()).filter(Boolean)
            : [];
        if (!connectionId || !groupId || !memberIds.length) {
            return res.status(400).json({ ok: false, message: 'connection_id, group_id and member_ids required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const result = await slot.api.addUserToGroup(memberIds, groupId);
            return res.json({ ok: true, result });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    app.post('/ui/group-members/remove', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const groupId = String(req.body?.group_id || '').trim();
        const memberId = String(req.body?.member_id || '').trim();
        if (!connectionId || !groupId || !memberId) {
            return res.status(400).json({ ok: false, message: 'connection_id, group_id and member_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            const api = slot.api;
            const fn =
                (typeof api.removeUserFromGroup === 'function' && api.removeUserFromGroup) ||
                (typeof api.kickUserFromGroup === 'function' && api.kickUserFromGroup) ||
                (typeof api.removeMemberFromGroup === 'function' && api.removeMemberFromGroup) ||
                (typeof api.kickMember === 'function' && api.kickMember) ||
                null;
            if (!fn) {
                return res.status(500).json({ ok: false, message: 'remove_member_not_supported' });
            }
            const result = await fn.call(api, memberId, groupId);
            return res.json({ ok: true, result });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });

    /**
     * P08 — resync thủ công: kéo tin 1-1 + nhóm qua WS cmd 510/511.
     * Kết quả về ASYNC qua event old_messages → webhook (dedup source_id) —
     * response ở đây KHÔNG biết số tin.
     *   days > 0  → deep sync: cursor paginate lùi tới mốc days (chạy nền).
     *   days = 0  → single-shot window gần nhất; last_msg_id = cursor tùy chọn.
     */
    app.post('/backfill/threads', (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        if (!connectionId) {
            return res.status(400).json({ ok: false, message: 'connection_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot?.api?.listener || slot.loginPhase !== 'ready' || !slot.personalUid) {
            return res.status(409).json({ ok: false, message: 'not_connected' });
        }

        const days = Math.min(90, Math.max(0, Number(req.body?.days) || 0));
        if (days > 0) {
            if (slot._deepBackfillRunning) {
                return res.status(409).json({ ok: false, message: 'deep_backfill_running' });
            }
            void deepThreadBackfill(slot, { days }).then((totals) => {
                if (totals) {
                    console.info('deep backfill done connection_id=', connectionId, JSON.stringify(totals));
                }
            });
            return res.json({ ok: true, deep: true, days, async: true });
        }

        const lastMsgId = req.body?.last_msg_id ? String(req.body.last_msg_id) : null;
        const requested = requestThreadBackfill(slot, lastMsgId);
        if (requested.length === 0) {
            return res.status(502).json({ ok: false, message: 'request_old_messages_unavailable' });
        }
        return res.json({ ok: true, requested, async: true });
    });

    app.post('/backfill/group', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const groupId = String(req.body?.group_id || '').trim();
        const count = Math.min(200, Number(req.body?.count) || 100);
        if (!connectionId || !groupId) {
            return res.status(400).json({ ok: false, message: 'connection_id and group_id required' });
        }
        const slot = getSlot(String(connectionId));
        // Khớp định nghĩa connected của /health: loginPhase === 'ready' (session restore cũng = 'ready',
        // KHÔNG phải 'session_ok' — 'session_ok' chỉ set lúc QR mới).
        if (!slot?.api?.getGroupChatHistory || slot.loginPhase !== 'ready' || !slot.personalUid) {
            return res.status(409).json({ ok: false, message: 'not_connected' });
        }
        let msgs;
        try {
            const res2 = await slot.api.getGroupChatHistory(groupId, count);
            msgs = Array.isArray(res2?.groupMsgs) ? res2.groupMsgs : (Array.isArray(res2) ? res2 : []);
        } catch (e) {
            return res.status(502).json({ ok: false, message: e?.message || String(e) });
        }
        for (const m of msgs) {
            const rawD = m?.data ?? m;
            const isSelf = String(rawD?.uidFrom ?? '') === String(slot.personalUid ?? '');
            const payload = buildGroupBackfillPayload(slot, groupId, rawD, isSelf);
            if (payload) await enqueueOutbox(payload);
        }
        return res.json({ ok: true, fetched: msgs.length });
    });

    app.post('/ui/group/update', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        const groupId = String(req.body?.group_id || '').trim();
        const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
        const settings = req.body?.settings && typeof req.body.settings === 'object' ? req.body.settings : null;
        const avatarUrl = typeof req.body?.avatar_url === 'string' ? req.body.avatar_url.trim() : '';
        const clearAvatar = false;
        if (!connectionId || !groupId) {
            return res.status(400).json({ ok: false, message: 'connection_id and group_id required' });
        }
        const slot = getSlot(String(connectionId));
        if (!slot.api) {
            return res.status(503).json({ ok: false, message: 'not_logged_in' });
        }
        try {
            if (name) {
                await slot.api.changeGroupName(name, groupId);
            }
            if (settings) {
                await slot.api.updateGroupSettings(settings, groupId);
            }
            let avatar_updated = false;
            let avatar_cleared = false;
            let avatar_url = '';
            if (avatarUrl) {
                const avatarSource = await attachmentFromUrl(avatarUrl);
                if (avatarSource) {
                    await slot.api.changeGroupAvatar(avatarSource, groupId);
                    avatar_updated = true;
                }
            }
            try {
                if (avatar_updated || avatar_cleared) {
                    const gi = await slot.api.getGroupInfo(groupId);
                    const map = gi?.gridInfoMap && typeof gi.gridInfoMap === 'object' ? gi.gridInfoMap : {};
                    const info = map[groupId] || map[String(groupId)] || Object.values(map)[0] || null;
                    avatar_url = info?.fullAvt || info?.avt || '';
                }
            } catch {
                // ignore
            }
            // For clear_avatar, force empty avatar_url to avoid showing stale cached URL in UI
            return res.json({ ok: true, avatar_updated, avatar_cleared, avatar_url });
        } catch (e) {
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });
}

