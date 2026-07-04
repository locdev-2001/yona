import dotenv from 'dotenv';
import dns from 'node:dns';
import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { Zalo, ThreadType, LoginQRCallbackEventType, CloseReason } from 'zca-js';
import { registerPersonalMessageRoutes } from './routes/personal-messages.mjs';
import { registerUiActionsRoutes } from './routes/ui-actions.mjs';
import { registerZcaDispatchRoutes } from './routes/zca-dispatch.mjs';
import { createOutbox } from './outbox.mjs';
import { backfillOnReconnect, computeGapMs } from './reconnect-backfill.mjs';
import { deriveInboundSourceId } from './inbound-source-id.mjs';
import { attachRelayForwarder } from './relay-forwarder.mjs';
import {
    buildAllowedHosts,
    collectSourceIdsFromSendResult,
    downloadUrlToTemp,
    extFromFilename,
    mimeToExt,
    MEDIA_KIND_DEFAULT_EXT,
} from './media-fetch.mjs';

dns.setDefaultResultOrder('ipv4first');

const __dirname_src = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.join(__dirname_src, '..');

dotenv.config({ path: path.join(PLUGIN_ROOT, '.env') });

const SESSIONS_DIR = path.join(PLUGIN_ROOT, '.sessions');
const OUTBOX_DIR = path.join(PLUGIN_ROOT, '.outbox');
const OUTBOX_DEAD_DIR = path.join(PLUGIN_ROOT, '.outbox-dead');
const BRIDGE_HTTP_PORT = Number(process.env.BRIDGE_HTTP_PORT || 3710);
const BRIDGE_SEND_SECRET = process.env.BRIDGE_SEND_SECRET || '';
const BRIDGE_UI_SECRET = process.env.BRIDGE_UI_SECRET || '';
// P11: secret RIÊNG cho 39 method destructive qua /zca/:method (defense-in-depth,
// quyền thật gate ở Laravel TenantPermission::ZaloDestructive). Rỗng = không bao giờ elevated.
const BRIDGE_ELEVATED_SECRET = process.env.BRIDGE_ELEVATED_SECRET || '';
const LARAVEL_WEBHOOK_URL = process.env.LARAVEL_WEBHOOK_URL || '';
const LARAVEL_WEBHOOK_SECRET = process.env.LARAVEL_WEBHOOK_SECRET || '';

// Tier 1 outbox — khởi tạo sớm, start() gọi sau bootRestoreAllSessions()
const outbox = createOutbox({
    dir: OUTBOX_DIR,
    deadDir: OUTBOX_DEAD_DIR,
    webhookUrl: LARAVEL_WEBHOOK_URL,
    webhookSecret: LARAVEL_WEBHOOK_SECRET,
});

const ZCA_USER_AGENT =
    process.env.ZCA_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';
async function zcaImageMetadataGetter(filePath) {
    try {
        const metadata = await sharp(filePath).metadata();
        if (metadata.width == null || metadata.height == null) {
            return null;
        }
        const st = await fs.stat(filePath);
        return {
            width: metadata.width,
            height: metadata.height,
            size: metadata.size ?? st.size,
        };
    } catch {
        return null;
    }
}

const ZALO_OPTIONS = {
    selfListen: true,
    imageMetadataGetter: zcaImageMetadataGetter,
};

const slots = new Map();

const OUTBOUND_ECHO_TTL_MS = 120000;
const OUTBOUND_ECHO_MAX_IDS = 500;

function createSlotState() {
    return {
        api: null,
        personalUid: '',
        integratedDisplayName: '',
        integratedAvatar: null,
        loginPhase: 'idle',
        qrImageBase64: null,
        lastError: null,
        sessionLostReason: null,
        botId: 0,
        listenerStarted: false,
        outboundEchoIds: new Map(),
        // P11: workspace bind lúc promote (B1 token-từ-session) + allowlist reflect cache
        workspaceId: '',
        allowlist: null,
        // P12: forwarder generic attach đúng 1 lần/api instance (review MED-2)
        forwarderAttached: false,
    };
}

function pruneOutboundEchoIds(slot) {
    const now = Date.now();
    const m = slot.outboundEchoIds;
    if (!(m instanceof Map)) {
        return;
    }
    for (const [k, exp] of m) {
        if (exp <= now) {
            m.delete(k);
        }
    }
    while (m.size > OUTBOUND_ECHO_MAX_IDS) {
        const first = m.keys().next().value;
        m.delete(first);
    }
}

function registerBridgeOutboundSourceId(slot, sourceId) {
    if (sourceId === undefined || sourceId === null) {
        return;
    }
    const sid = String(sourceId).trim();
    if (!sid) {
        return;
    }
    pruneOutboundEchoIds(slot);
    slot.outboundEchoIds.set(sid, Date.now() + OUTBOUND_ECHO_TTL_MS);
}

function consumeBridgeOutboundEcho(slot, sourceId) {
    if (sourceId === undefined || sourceId === null) {
        return false;
    }
    const sid = String(sourceId).trim();
    if (!sid) {
        return false;
    }
    pruneOutboundEchoIds(slot);
    const exp = slot.outboundEchoIds.get(sid);
    if (exp === undefined) {
        return false;
    }
    if (exp < Date.now()) {
        slot.outboundEchoIds.delete(sid);
        return false;
    }
    slot.outboundEchoIds.delete(sid);
    return true;
}

function normalizeQrToken(raw) {
    if (typeof raw !== 'string') {
        return null;
    }
    const t = raw.trim().toLowerCase();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(t)) {
        return t;
    }
    return null;
}

function isQrSlotKey(key) {
    return String(key).startsWith('qr:');
}

function slotCookiePathForKey(key) {
    const ks = String(key);
    if (isQrSlotKey(ks)) {
        const token = ks.slice(3).replace(/-/g, '');
        return path.join(SESSIONS_DIR, `qt_${token}.json`);
    }
    return path.join(SESSIONS_DIR, `c${ks}.json`);
}

function slotMetaPathForKey(key) {
    return `${slotCookiePathForKey(key)}.meta.json`;
}

function getSlot(key) {
    const k = String(key);
    if (!slots.has(k)) {
        slots.set(k, createSlotState());
    }
    return slots.get(k);
}

async function readSlotMetaForKey(key) {
    const p = slotMetaPathForKey(key);
    if (!existsSync(p)) {
        return null;
    }
    try {
        const raw = await fs.readFile(p, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

async function writeSlotMetaForKey(key, meta) {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    await fs.writeFile(slotMetaPathForKey(key), JSON.stringify(meta, null, 0), 'utf8');
}

function slotKeyFromRequest(req) {
    const qt = normalizeQrToken(req.query?.qr_token ?? req.body?.qr_token ?? '');
    if (qt) {
        return `qr:${qt}`;
    }
    const q = req.query?.connection_id ?? req.body?.connection_id;
    const n = Number(q);
    if (Number.isFinite(n) && n > 0) {
        return String(n);
    }
    return null;
}

function checkUiSecret(req) {
    // F10-audit: fail-CLOSED — secret rỗng → từ chối (không phải bypass).
    if (!BRIDGE_UI_SECRET) {
        return false;
    }
    const h = req.header('X-Bridge-UI-Secret') || req.query.ui_secret || '';
    return h === BRIDGE_UI_SECRET;
}

function extractInboundPlainText(message) {
    const d = message?.data;
    const c = d?.content;
    if (typeof c === 'string' && c.trim() !== '') {
        return c;
    }
    if (c && typeof c === 'object') {
        if (typeof c.text === 'string' && c.text.trim() !== '') {
            return c.text;
        }
        if (typeof c.msg === 'string' && c.msg.trim() !== '') {
            return c.msg;
        }
        if (typeof c.title === 'string' && (typeof c.href === 'string' || typeof c.url === 'string')) {
            const link = String(c.href || c.url || '').trim();
            const title = c.title.trim();
            if (link !== '') {
                return `[Link] ${title} ${link}`.trim();
            }
            if (title !== '') {
                return title;
            }
        }
    }
    if (typeof d?.message === 'string' && d.message.trim() !== '') {
        return d.message;
    }
    return null;
}

function normalizeUrlForCompare(u) {
    if (typeof u !== 'string' || !u.trim()) {
        return '';
    }
    try {
        const a = new URL(u);
        return a.href.replace(/\/+$/, '');
    } catch {
        return u.trim().replace(/\/+$/, '');
    }
}

function extractMediaCaption(message, primaryHref) {
    const plain = extractInboundPlainText(message);
    if (plain == null || plain === '') {
        return null;
    }
    if (primaryHref && typeof primaryHref === 'string') {
        const p = normalizeUrlForCompare(primaryHref);
        const pl = plain.trim();
        if (p && (normalizeUrlForCompare(pl) === p || pl.includes(p)) && (pl.startsWith('[Link]') || pl === p)) {
            return null;
        }
    }
    return plain;
}

function isSupportedThread(message) {
    const t = message?.type;
    return (
        t === ThreadType.User ||
        Number(t) === 0 ||
        t === ThreadType.Group ||
        Number(t) === 1
    );
}

function mapUserName(message) {
    const d = message?.data;
    if (!d) {
        return 'Zalo User';
    }
    if (typeof d.dName === 'string' && d.dName) {
        return d.dName;
    }
    if (typeof d.uidFrom === 'string') {
        return d.uidFrom;
    }
    return 'Zalo User';
}

function stableJsonForDedup(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableJsonForDedup).join(',')}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => JSON.stringify(k) + ':' + stableJsonForDedup(value[k])).join(',')}}`;
}

/**
 * P06: khoá theo accountUid (ổn định qua reconnect) — KHÔNG connectionId (đổi mỗi
 * lần reconnect, sẽ tách cùng 1 event thành 2 source_id khác nhau).
 */
function zaloPersonalSocialSourceId(accountUid, socialKind, act, threadId, eventPayload) {
    const h = createHash('sha256')
        .update(String(accountUid))
        .update('\n')
        .update(String(socialKind))
        .update('\n')
        .update(String(act ?? ''))
        .update('\n')
        .update(String(threadId ?? ''))
        .update('\n')
        .update(stableJsonForDedup(eventPayload))
        .digest('hex')
        .slice(0, 48);
    return `zps:${accountUid}:${h}`;
}

async function postZaloPersonalSocialEvent(body) {
    if (!LARAVEL_WEBHOOK_URL) return;
    await outbox.enqueue(body);
}

async function postInbound(body) {
    if (!LARAVEL_WEBHOOK_URL) return;
    await outbox.enqueue(body);
}

async function postBridgeSession({ connection_id, bot_id, state, detail }) {
    if (!LARAVEL_WEBHOOK_URL || !connection_id || !bot_id) return;
    await outbox.enqueue({ type: 'bridge_session', connection_id, bot_id, state, detail: detail ?? null });
}

/**
 * P12/H3: lane fire-and-forget cho event chatty (typing/seen/delivered/…) —
 * POST thẳng, KHÔNG qua outbox durable (nghẽn FIFO chặn inbound). Lỗi bỏ qua.
 * Vẫn ký LARAVEL_WEBHOOK_SECRET như đường outbox.
 */
function postRelayFireAndForget(body) {
    if (!LARAVEL_WEBHOOK_URL) return;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (LARAVEL_WEBHOOK_SECRET) {
        headers['X-Zalo-Personal-Bridge-Secret'] = LARAVEL_WEBHOOK_SECRET;
    }
    fetch(LARAVEL_WEBHOOK_URL, { method: 'POST', headers, body: JSON.stringify(body) }).catch(() => {});
}

function pickMediaUrl(c) {
    if (!c || typeof c !== 'object') {
        return null;
    }
    return c.href || c.url || c.thumb || c.thumbnail || null;
}

function coerceContentObject(c) {
    if (c && typeof c === 'string') {
        const t = c.trim();
        if (t.startsWith('{')) {
            try {
                const o = JSON.parse(t);
                if (o && typeof o === 'object') {
                    return o;
                }
            } catch {
                return c;
            }
        }
    }
    return c;
}

function parseMsgInfoObject(raw) {
    if (raw == null) {
        return null;
    }
    if (typeof raw === 'object') {
        return raw;
    }
    if (typeof raw === 'string' && raw.trim().startsWith('{')) {
        try {
            const o = JSON.parse(raw);
            return o && typeof o === 'object' ? o : null;
        } catch {
            return null;
        }
    }
    return null;
}

function extractPhoneAndQrFromCardObject(obj) {
    let phone = null;
    let qrCodeUrl = null;
    const applyMi = (mi) => {
        if (!mi || typeof mi !== 'object') {
            return;
        }
        if (!phone) {
            phone = mi.phone ?? mi.phoneNumber ?? mi.mobile ?? mi.tel ?? null;
        }
        if (!qrCodeUrl) {
            qrCodeUrl = mi.qrCodeUrl ?? mi.qr_code_url ?? mi.qrCode ?? null;
        }
    };
    applyMi(parseMsgInfoObject(obj.msgInfo));
    if (typeof obj.params === 'string') {
        const p = obj.params.trim();
        if (p.startsWith('{')) {
            try {
                const nested = JSON.parse(p);
                if (nested && typeof nested === 'object') {
                    applyMi(parseMsgInfoObject(nested.msgInfo) || nested);
                }
            } catch {
                /* ignore */
            }
        }
    }
    if (!phone) {
        phone = obj.phone ?? obj.phoneNumber ?? obj.mobile ?? obj.tel ?? null;
    }
    if (!phone) {
        const sub = (obj.subtitle || obj.subTitle || '').trim();
        if (sub && /^[\d+][\d\s.+()-]{7,}$/.test(sub)) {
            phone = sub;
        }
    }
    if (!qrCodeUrl) {
        qrCodeUrl = obj.qrCodeUrl ?? obj.qr_code_url ?? obj.qrCode ?? null;
    }
    return {
        phone: phone != null && String(phone).trim() !== '' ? String(phone).trim() : null,
        qr_code_url: qrCodeUrl != null && String(qrCodeUrl).trim() !== '' ? String(qrCodeUrl).trim() : null,
    };
}

function isLikelyZaloUserIdString(s) {
    if (typeof s !== 'string' && typeof s !== 'number') {
        return false;
    }
    const t = String(s).trim();
    if (!/^\d+$/.test(t)) {
        return false;
    }
    return t.length >= 9 && t.length <= 20;
}

function extractUidFromParamsString(p) {
    if (!p || typeof p !== 'string') {
        return null;
    }
    const t = p.trim();
    const m = t.match(/(?:^|[&?"'])(?:contactUid|contact_uid|userId|uid)=(\d{9,20})(?:[^0-9]|$)/i);
    return m ? m[1] : null;
}

function mergeContactScanInto(target, src) {
    if (src.phone && !target.phone) {
        target.phone = src.phone;
    }
    if (src.qr_code_url && !target.qr_code_url) {
        target.qr_code_url = src.qr_code_url;
    }
    if (src.contact_uid && !target.contact_uid) {
        target.contact_uid = src.contact_uid;
    }
    return target;
}

function deepCollectContactFields(root, depth = 0, visited = new WeakSet()) {
    const out = { phone: null, qr_code_url: null, contact_uid: null };
    if (depth > 14 || root == null) {
        return out;
    }
    if (typeof root === 'string') {
        const t = root.trim();
        if (t.startsWith('{') && t.length < 100000) {
            try {
                return deepCollectContactFields(JSON.parse(t), depth + 1, visited);
            } catch {
                return out;
            }
        }
        return out;
    }
    if (typeof root !== 'object') {
        return out;
    }
    if (visited.has(root)) {
        return out;
    }
    visited.add(root);
    for (const [k, v] of Object.entries(root)) {
        const kl = k.toLowerCase();
        if (
            (kl.includes('phone') || kl === 'mobile' || kl === 'tel' || kl === 'sdt') &&
            (typeof v === 'string' || typeof v === 'number') &&
            String(v).trim() !== ''
        ) {
            const pv = String(v).trim();
            if (/^[\d+][\d\s.+()-]{6,}$/.test(pv) || /^\+?\d{8,}$/.test(pv.replace(/\s/g, ''))) {
                if (!out.phone) {
                    out.phone = pv;
                }
            }
        }
        if (
            (kl.includes('qrcode') || kl.includes('qr_code') || kl === 'qrcodeurl') &&
            typeof v === 'string' &&
            /^https?:\/\//i.test(v.trim())
        ) {
            if (!out.qr_code_url) {
                out.qr_code_url = v.trim();
            }
        }
        if (
            (kl === 'contactuid' ||
                kl === 'contact_uid' ||
                kl === 'contactid' ||
                kl === 'contact_id') &&
            isLikelyZaloUserIdString(v)
        ) {
            if (!out.contact_uid) {
                out.contact_uid = String(v).trim();
            }
        }
        if (typeof v === 'object' && v !== null) {
            mergeContactScanInto(out, deepCollectContactFields(v, depth + 1, visited));
        }
        if (typeof v === 'string' && v.trim().startsWith('{')) {
            try {
                mergeContactScanInto(out, deepCollectContactFields(JSON.parse(v), depth + 1, visited));
            } catch {
                /* ignore */
            }
        }
    }
    return out;
}

function resolveCallOutcomeFromZalo(actionKind, isCaller, reason, duration) {
    if (actionKind === 'calltime' && duration > 0) {
        return 'completed';
    }
    if (!isCaller) {
        return 'missed';
    }
    if (reason === 3 || reason === 5) {
        return 'busy';
    }
    if (reason === 2 || reason === 4 || reason === 1) {
        return 'canceled';
    }
    return 'missed';
}

function buildCallPayloadFromZaloRecommended(actionKind, params) {
    const isCaller = Number(params.isCaller ?? params.is_caller ?? 0) === 1;
    const reason = Number(params.reason ?? 0);
    const duration = Number(params.duration ?? 0);
    const calltype = Number(params.calltype ?? params.call_type ?? 0);
    return {
        media: calltype === 2 ? 'video' : 'voice',
        direction: isCaller ? 'outbound' : 'inbound',
        outcome: resolveCallOutcomeFromZalo(actionKind, isCaller, reason, duration),
        duration_seconds: duration,
        callback_enabled: Number(params.isEnableCallback ?? params.is_enable_callback ?? 0) === 1,
    };
}

function parseZaloRecommendedCallContent(c) {
    const obj = coerceContentObject(c);
    if (!obj || typeof obj !== 'object') {
        return null;
    }
    const action = String(obj.action || '').toLowerCase();
    let actionKind = null;
    if (action.includes('calltime')) {
        actionKind = 'calltime';
    } else if (action.includes('misscall')) {
        actionKind = 'misscall';
    }
    if (!actionKind) {
        return null;
    }
    let params = obj.params;
    if (typeof params === 'string') {
        try {
            params = JSON.parse(params);
        } catch {
            params = {};
        }
    }
    if (!params || typeof params !== 'object') {
        params = {};
    }
    return buildCallPayloadFromZaloRecommended(actionKind, params);
}

function parseBusinessCardFields(c, dataRoot) {
    const obj = coerceContentObject(c);
    if (!obj || typeof obj !== 'object') {
        return null;
    }
    const rawUrl =
        obj.href ||
        obj.url ||
        obj.link ||
        obj.src ||
        (typeof obj.original === 'string' ? obj.original : null);
    let url = rawUrl != null && String(rawUrl).trim() !== '' ? String(rawUrl).trim() : null;
    if (!url && typeof obj.params === 'string') {
        const p = obj.params.trim();
        if (p.startsWith('{')) {
            try {
                const nested = JSON.parse(p);
                const inner = nested.href || nested.url || nested.link;
                if (inner) {
                    url = String(inner).trim();
                }
            } catch {
                /* ignore */
            }
        }
        if (!url) {
            const m = p.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
            if (m) {
                url = m[1];
            }
        }
    }
    if (!url) {
        return null;
    }
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`;
    const title = (obj.title || obj.description || obj.name || obj.dName || '').trim();
    const name = title || normalizedUrl;
    const extra = extractPhoneAndQrFromCardObject(obj);
    const scanC = deepCollectContactFields(obj);
    const scanD =
        dataRoot && typeof dataRoot === 'object'
            ? deepCollectContactFields(dataRoot)
            : { phone: null, qr_code_url: null, contact_uid: null };
    const merged = { phone: null, qr_code_url: null, contact_uid: null };
    mergeContactScanInto(merged, { phone: extra.phone, qr_code_url: extra.qr_code_url, contact_uid: null });
    mergeContactScanInto(merged, scanC);
    mergeContactScanInto(merged, scanD);
    if (!merged.contact_uid && typeof obj.params === 'string') {
        const fromParams = extractUidFromParamsString(obj.params);
        if (fromParams) {
            merged.contact_uid = fromParams;
        }
    }
    return {
        name,
        title: title || name,
        thumbnail: obj.thumb || obj.thumbnail || obj.avatar || null,
        url: normalizedUrl,
        phone: merged.phone,
        qr_code_url: merged.qr_code_url,
        contact_uid: merged.contact_uid,
    };
}

function extractBusinessCardCaption(message, normalizedUrl) {
    const plain = extractInboundPlainText(message);
    if (plain == null || plain === '') {
        return null;
    }
    const p = plain.trim();
    if (!p.startsWith('[Link]')) {
        return plain;
    }
    const withoutScheme = (s) =>
        String(s)
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./, '');
    const target = withoutScheme(normalizedUrl);
    if (target && (p.includes(target) || p.includes(normalizedUrl) || p.includes(withoutScheme(normalizedUrl)))) {
        return null;
    }
    return plain;
}

function hostnameOfHttpUrl(url) {
    if (typeof url !== 'string' || !url.trim()) {
        return '';
    }
    try {
        return new URL(url.trim()).hostname.toLowerCase();
    } catch {
        return '';
    }
}

function isZaloStaticCdnHost(hostname) {
    if (!hostname) {
        return false;
    }
    return hostname === 'res-zalo.zadn.vn' || hostname.endsWith('.zadn.vn');
}

function shouldDropZaloLinkBanner(msgType, c, card) {
    if (msgType !== 'chat.link' && msgType !== 'chat.recommended') {
        return false;
    }
    if (!card?.url) {
        return false;
    }
    if (!isZaloStaticCdnHost(hostnameOfHttpUrl(card.url))) {
        return false;
    }
    if (card.phone || card.contact_uid) {
        return false;
    }
    const obj = coerceContentObject(c);
    if (obj && typeof obj === 'object') {
        const title = (obj.title || obj.description || '').trim();
        if (title !== '') {
            return false;
        }
    }
    return true;
}

function plainTextIsLinkOnlyZaloBanner(plain) {
    const t = typeof plain === 'string' ? plain.trim() : '';
    const m = t.match(/^\[Link\]\s+(https?:\/\/\S+)$/i);
    if (!m) {
        return false;
    }
    return isZaloStaticCdnHost(hostnameOfHttpUrl(m[1]));
}

function parseQuoteObject(raw) {
    if (raw == null) {
        return null;
    }
    if (typeof raw === 'object') {
        return raw;
    }
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (t.startsWith('{')) {
            try {
                const o = JSON.parse(t);
                return typeof o === 'object' && o !== null ? o : null;
            } catch {
                return null;
            }
        }
    }
    return null;
}

function deepFindQuotedMessageId(obj, depth = 0) {
    if (depth > 10 || obj == null) {
        return null;
    }
    if (typeof obj === 'string') {
        const t = obj.trim();
        if (t.startsWith('{')) {
            try {
                return deepFindQuotedMessageId(JSON.parse(t), depth + 1);
            } catch {
                return null;
            }
        }
        return null;
    }
    if (typeof obj !== 'object' || Array.isArray(obj)) {
        return null;
    }
    const keys = [
        'msgId',
        'msg_id',
        'messageId',
        'cliMsgId',
        'cli_msg_id',
        'quoteMsgId',
        'qmsgId',
        'qmsg_id',
        'parentMsgId',
        'refMsgId',
    ];
    for (const k of keys) {
        const v = obj[k];
        if (v != null && String(v).trim() !== '') {
            return String(v).trim();
        }
    }
    for (const v of Object.values(obj)) {
        if (v != null && typeof v === 'object') {
            const hit = deepFindQuotedMessageId(v, depth + 1);
            if (hit) {
                return hit;
            }
        }
    }
    return null;
}

function parsePropertyExtQuoteMsgId(d) {
    if (!d || typeof d !== 'object') {
        return null;
    }
    const pe = d.propertyExt;
    if (typeof pe !== 'string' || !pe.trim().startsWith('{')) {
        return null;
    }
    try {
        const o = JSON.parse(pe);
        const direct =
            o?.quoteMsgId ?? o?.qmsgId ?? o?.qmsg_id ?? o?.quote_msg_id ?? o?.refMsgId ?? o?.parentMsgId;
        if (direct != null && String(direct).trim() !== '') {
            return String(direct).trim();
        }
        return deepFindQuotedMessageId(o);
    } catch {
        return null;
    }
}

function parseStickerRefFromQuote(q) {
    if (!q || typeof q !== 'object') {
        return null;
    }
    if (typeof q.attach === 'string' && q.attach.trim().startsWith('{')) {
        try {
            const o = JSON.parse(q.attach);
            if (o.catId != null && o.id != null) {
                return {
                    catId: Number(o.catId),
                    id: Number(o.id),
                    type: o.type != null ? Number(o.type) : null,
                };
            }
        } catch {
            /* ignore */
        }
    }
    const msgTok = typeof q.msg === 'string' ? q.msg.trim() : '';
    const m = msgTok.match(/^\[\^(\d+),(\d+)\^\]$/);
    if (m) {
        return { catId: Number(m[1]), id: Number(m[2]), type: null };
    }
    if (q.content && typeof q.content === 'object' && q.content.catId != null && q.content.id != null) {
        return {
            catId: Number(q.content.catId),
            id: Number(q.content.id),
            type: q.content.type != null ? Number(q.content.type) : null,
        };
    }
    return null;
}

function extractQuoteFromListenerMessage(message) {
    const d = message?.data;
    if (!d || typeof d !== 'object') {
        return null;
    }
    const qRaw = d.quote ?? d.quoteMsg ?? null;
    const q = parseQuoteObject(qRaw) ?? (typeof qRaw === 'object' && qRaw !== null ? qRaw : null);
    const candidates = [
        ...(message?.quote != null
            ? [
                  deepFindQuotedMessageId(
                      typeof message.quote === 'object' ? message.quote : parseQuoteObject(message.quote)
                  ),
              ]
            : []),
        parsePropertyExtQuoteMsgId(d),
        d.quoteMsgId,
        d.quote_msg_id,
        d.quotedMsgId,
        d.refMsgId,
        d.ref_msg_id,
        d.parentMsgId,
        d.parent_msg_id,
        d.cliMsgIdRef,
        q && typeof q === 'object' && Number(q.globalMsgId) > 0 ? String(q.globalMsgId) : null,
        q && typeof q === 'object' ? q.msgId : null,
        q && typeof q === 'object' ? q.msg_id : null,
        q && typeof q === 'object' ? q.messageId : null,
        q && typeof q === 'object' && q.cliMsgId != null && String(q.cliMsgId).trim() !== ''
            ? String(q.cliMsgId).trim()
            : null,
        deepFindQuotedMessageId(q),
        deepFindQuotedMessageId(d.quoteMsg),
        deepFindQuotedMessageId(d.messageRef),
        deepFindQuotedMessageId(d.refMessage),
    ];
    let quoteMsgId = null;
    for (const v of candidates) {
        if (v != null && String(v).trim() !== '') {
            quoteMsgId = String(v).trim();
            break;
        }
    }
    let quote = null;
    if (q && typeof q === 'object') {
        const tid =
            [q.msgId, q.msg_id, q.messageId].find((v) => v != null && String(v).trim() !== '') ??
            (q.cliMsgId != null && String(q.cliMsgId).trim() !== '' ? q.cliMsgId : null) ??
            deepFindQuotedMessageId(q) ??
            null;
        quote = {};
        if (tid != null && String(tid).trim() !== '') {
            quote.msg_id = String(tid).trim();
        }
        if (q.cliMsgId != null && String(q.cliMsgId).trim() !== '') {
            quote.cli_msg_id = String(q.cliMsgId).trim();
        }
        if (q.ts != null && String(q.ts).trim() !== '') {
            const tsn = Number(q.ts);
            if (Number.isFinite(tsn) && tsn > 0) {
                quote.quote_ts = Math.round(tsn);
            }
        }
        const txt =
            (typeof q.text === 'string' && q.text.trim() !== '' ? q.text : null) ??
            (typeof q.content === 'string' && q.content.trim() !== '' ? q.content : null) ??
            (typeof q.message === 'string' && q.message.trim() !== '' ? q.message : null) ??
            (typeof q.msg === 'string' && q.msg.trim() !== '' ? q.msg : null) ??
            (typeof q.title === 'string' && q.title.trim() !== '' ? q.title : null) ??
            (typeof q.description === 'string' && q.description.trim() !== '' ? q.description : null);
        if (txt != null && String(txt).trim() !== '') {
            quote.text = String(txt);
        }
        const sn = q.dName ?? q.senderName ?? q.ownerName ?? null;
        if (sn != null && String(sn).trim() !== '') {
            quote.sender_name = String(sn).trim();
        }
        if (q.sender && typeof q.sender === 'object' && q.sender.name) {
            quote.sender = { name: String(q.sender.name) };
        }
        const mt = q.msgType ?? q.msg_type ?? null;
        if (mt != null && String(mt).trim() !== '') {
            quote.msg_type = String(mt).trim();
        }
        const sr = parseStickerRefFromQuote(q);
        if (sr) {
            quote.sticker_ref = sr;
        }
        // Reply tới tin KHÔNG phải text (ảnh/file/video...): TQuote.attach là JSON {thumb,href,type,title};
        // cliMsgType là loại (số); fromD là tên người gửi tin được trả lời.
        if (!quote.sender_name && q.fromD != null && String(q.fromD).trim() !== '') {
            quote.sender_name = String(q.fromD).trim();
        }
        if (q.cliMsgType != null && Number.isFinite(Number(q.cliMsgType))) {
            quote.cli_msg_type = Number(q.cliMsgType);
        }
        if (typeof q.attach === 'string' && q.attach.trim().startsWith('{')) {
            try {
                const a = JSON.parse(q.attach);
                if (a && typeof a === 'object') {
                    const thumb = a.thumb || a.href || null;
                    if (thumb) quote.thumb = String(thumb);
                    if (a.type) quote.attach_type = String(a.type);
                    if (!quote.text && a.title && String(a.title).trim() !== '') quote.text = String(a.title);
                }
            } catch {
                // attach không phải JSON → bỏ qua
            }
        }
        if (Object.keys(quote).length === 0) {
            quote = null;
        }
    }
    if (!quoteMsgId && quote?.msg_id) {
        quoteMsgId = String(quote.msg_id);
    }
    if (!quoteMsgId && !quote) {
        return null;
    }
    return { quote_msg_id: quoteMsgId, quote };
}

function logZaloQuoteInspect(message, quoteInfo) {
    if (process.env.ZALO_BRIDGE_LOG_QUOTE === '0') {
        return;
    }
    const d = message?.data;
    if (!d || typeof d !== 'object') {
        return;
    }
    const c = d.content;
    const stickerish =
        typeof c === 'string' && /^\[\^[0-9]+,[0-9]+\^\]$/.test(String(c).trim());
    const hasQuoteShape =
        quoteInfo ||
        d.quote ||
        d.quoteMsg ||
        d.propertyExt ||
        d.quoteMsgId ||
        d.quote_msg_id ||
        stickerish;
    if (!hasQuoteShape) {
        return;
    }
    let dataJson = '';
    try {
        dataJson = JSON.stringify(d);
        if (dataJson.length > 16000) {
            dataJson = `${dataJson.slice(0, 16000)}…[truncated]`;
        }
    } catch (e) {
        dataJson = String(e);
    }
    console.info('[zalo-bridge:quote-inspect]', {
        threadId: message.threadId,
        msgId: d.msgId ?? d.msgID,
        msgType: d.msgType,
        quoteInfo,
        messageData: dataJson,
    });
}

function parseInboundDescriptor(message) {
    const d = message?.data;
    if (!d) {
        return null;
    }
    const msgType = d.msgType || '';
    const c = d.content;
    const peerUid = String(message.threadId || '');

    if (msgType === 'chat.sticker') {
        let raw = c;
        if (typeof raw === 'string') {
            try {
                raw = JSON.parse(raw);
            } catch {
                raw = null;
            }
        }
        if (raw && typeof raw === 'object') {
            return { inbound_kind: 'sticker', sticker: raw, peerUid, msgType };
        }
    }

    if (msgType === 'chat.photo' || msgType === 'chat.gif') {
        const href = pickMediaUrl(c);
        if (href) {
            return {
                inbound_kind: msgType === 'chat.gif' ? 'gif' : 'image',
                media_url: href,
                caption: extractMediaCaption(message, href),
                peerUid,
                msgType,
            };
        }
    }

    if (msgType === 'chat.video.msg') {
        const href = pickMediaUrl(c);
        if (href) {
            return {
                inbound_kind: 'video',
                media_url: href,
                caption: extractMediaCaption(message, href),
                peerUid,
                msgType,
            };
        }
    }

    if (msgType === 'chat.voice') {
        const href = pickMediaUrl(c);
        if (href) {
            return {
                inbound_kind: 'audio',
                media_url: href,
                caption: null,
                peerUid,
                msgType,
            };
        }
    }

    if (msgType === 'share.file') {
        const href = pickMediaUrl(c);
        const filename = typeof c === 'object' && c ? c.title || c.name || c.fileName || null : null;
        if (href) {
            return {
                inbound_kind: 'file',
                media_url: href,
                media_filename: filename,
                caption: extractMediaCaption(message, href),
                peerUid,
                msgType,
            };
        }
    }

    if (msgType === 'chat.link' || msgType === 'chat.recommended') {
        if (msgType === 'chat.recommended') {
            const callPayload = parseZaloRecommendedCallContent(c);
            if (callPayload) {
                return {
                    inbound_kind: 'call',
                    call: callPayload,
                    peerUid,
                    msgType,
                };
            }
        }
        const card = parseBusinessCardFields(c, d);
        if (card) {
            if (shouldDropZaloLinkBanner(msgType, c, card)) {
                return null;
            }
            if (!card.phone && d && (d.phone || d.phoneNumber)) {
                card.phone = String(d.phone ?? d.phoneNumber).trim();
            }
            if (!card.qr_code_url && d && (d.qrCodeUrl || d.qr_code_url)) {
                card.qr_code_url = String(d.qrCodeUrl ?? d.qr_code_url).trim();
            }
            return {
                inbound_kind: 'business_card',
                business_card: {
                    name: card.name,
                    title: card.title,
                    thumbnail: card.thumbnail,
                    url: card.url,
                    ...(card.phone ? { phone: card.phone } : {}),
                    ...(card.qr_code_url ? { qr_code_url: card.qr_code_url } : {}),
                    ...(card.contact_uid ? { contact_uid: card.contact_uid } : {}),
                },
                caption: extractBusinessCardCaption(message, card.url),
                peerUid,
                msgType,
            };
        }
    }

    const plain = extractInboundPlainText(message);
    if (plain === null || plain === '') {
        return null;
    }
    if ((msgType === 'chat.link' || msgType === 'chat.recommended') && plainTextIsLinkOnlyZaloBanner(plain)) {
        return null;
    }
    const cardFromPlain = tryZaloContactCardFromLinkPlain(plain);
    if (cardFromPlain) {
        return {
            inbound_kind: 'business_card',
            business_card: cardFromPlain,
            caption: null,
            peerUid,
            msgType,
        };
    }
    return { inbound_kind: 'text', text: plain, peerUid, msgType };
}

function tryZaloContactCardFromLinkPlain(plain) {
    const t = plain.trim();
    if (!/zaloapp\.com|zalo\.me/i.test(t)) {
        return null;
    }
    const m = t.match(/^\[Link\]\s+(.+?)\s+(https?:\/\/\S+|www\.[^\s]+)/);
    if (!m) {
        return null;
    }
    const title = m[1].trim();
    let url = m[2].trim();
    if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
    }
    return {
        name: title || url,
        title: title || url,
        thumbnail: null,
        url,
    };
}

function pickStickerIdFromRaw(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const id = raw.id ?? raw.sticker_id ?? raw.stickerId ?? raw.sid;
    if (id == null || id === '') {
        return null;
    }
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
}

async function resolveStickerForWebhook(api, raw) {
    const merged = raw && typeof raw === 'object' ? { ...raw } : {};
    const sid = pickStickerIdFromRaw(merged);
    if (sid != null && typeof api?.getStickersDetail === 'function') {
        try {
            const details = await api.getStickersDetail(sid);
            const arr = Array.isArray(details) ? details : [];
            const d = arr.find((x) => x && Number(x.id) === sid) || arr[0];
            if (d && typeof d === 'object') {
                if (d.stickerUrl) merged.stickerUrl = d.stickerUrl;
                if (d.stickerWebpUrl) merged.stickerWebpUrl = d.stickerWebpUrl;
                if (d.uri) merged.uri = d.uri;
                if (d.stickerSpriteUrl) merged.stickerSpriteUrl = d.stickerSpriteUrl;
                if (d.text != null) merged.text = d.text;
                merged.id = d.id ?? merged.id;
                merged.cateId = d.cateId ?? merged.cateId;
                merged.type = d.type ?? merged.type;
            }
        } catch (e) {
            console.warn('resolveStickerForWebhook', e?.message || e);
        }
    }

    const url = merged.url || merged.href || merged.stickerUrl || merged.stickerWebpUrl || merged.uri || null;
    const thumbnail =
        merged.thumbnail || merged.thumb || merged.stickerSpriteUrl || merged.stickerUrl || url || null;
    const description = merged.description ?? merged.text ?? merged.title ?? null;

    if (!url && sid == null) {
        console.warn('resolveStickerForWebhook: missing sticker id and url', raw);
    }

    return {
        ...merged,
        url,
        thumbnail,
        description,
    };
}

async function resolveBusinessCardForWebhook(api, card, message) {
    if (!card || typeof card !== 'object') {
        return card;
    }
    const d = message?.data;
    const c = coerceContentObject(d?.content);
    const merged = { phone: null, qr_code_url: null, contact_uid: null };
    mergeContactScanInto(merged, {
        phone: card.phone,
        qr_code_url: card.qr_code_url,
        contact_uid: card.contact_uid,
    });
    mergeContactScanInto(merged, deepCollectContactFields(c));
    mergeContactScanInto(merged, deepCollectContactFields(d));

    let phone = merged.phone;
    let qr_code_url = merged.qr_code_url;
    const uid =
        merged.contact_uid && isLikelyZaloUserIdString(merged.contact_uid)
            ? String(merged.contact_uid).trim()
            : null;

    if (uid && api) {
        if (!qr_code_url && typeof api.getQR === 'function') {
            try {
                const qrRes = await api.getQR(uid);
                if (qrRes && typeof qrRes === 'object') {
                    const hit = qrRes[uid] ?? qrRes[String(uid)];
                    if (typeof hit === 'string' && /^https?:\/\//i.test(hit)) {
                        qr_code_url = hit;
                    } else {
                        const vals = Object.values(qrRes).filter(
                            (x) => typeof x === 'string' && /^https?:\/\//i.test(x)
                        );
                        if (vals.length) {
                            qr_code_url = vals[0];
                        }
                    }
                }
            } catch (e) {
                console.warn('resolveBusinessCardForWebhook getQR', e?.message || e);
            }
        }
        if (!phone && typeof api.getUserInfo === 'function') {
            try {
                const res = await api.getUserInfo(uid);
                const profiles = res?.changed_profiles || {};
                const keys = Object.keys(profiles);
                const p = keys.length ? profiles[keys[0]] : null;
                const pn = p?.phoneNumber ?? p?.phone;
                if (pn && String(pn).trim()) {
                    phone = String(pn).trim();
                }
            } catch (e) {
                console.warn('resolveBusinessCardForWebhook getUserInfo', e?.message || e);
            }
        }
    }

    return {
        name: card.name,
        title: card.title,
        thumbnail: card.thumbnail,
        url: card.url,
        ...(phone ? { phone } : {}),
        ...(qr_code_url ? { qr_code_url } : {}),
    };
}

async function refreshIntegratedProfile(slot) {
    if (!slot?.api?.getUserInfo || !slot.personalUid) {
        return;
    }
    try {
        const res = await slot.api.getUserInfo(slot.personalUid);
        const profiles = res?.changed_profiles || {};
        const keys = Object.keys(profiles);
        if (!keys.length) {
            return;
        }
        const p = profiles[keys[0]];
        if (!p) {
            return;
        }
        slot.integratedDisplayName = p.displayName || p.zaloName || '';
        let av = p.avatar;
        if (typeof av === 'string' && av && !av.startsWith('http')) {
            av = `https://s120.avatar.zalo.me${av.startsWith('/') ? '' : '/'}${av}`;
        }
        slot.integratedAvatar = typeof av === 'string' && av ? av : null;
    } catch (e) {
        console.warn('refreshIntegratedProfile', e?.message || e);
    }
}

async function resolvePeerProfile(api, peerUid) {
    try {
        const res = await api.getUserInfo(peerUid);
        const profiles = res?.changed_profiles || {};
        const keys = Object.keys(profiles);
        if (!keys.length) {
            return null;
        }
        const p = profiles[keys[0]];
        if (!p) {
            return null;
        }
        let avatar = p.avatar;
        if (typeof avatar === 'string' && avatar && !avatar.startsWith('http')) {
            avatar = `https://s120.avatar.zalo.me${avatar.startsWith('/') ? '' : '/'}${avatar}`;
        }
        return {
            name: p.displayName || p.zaloName || 'Zalo User',
            avatar: typeof avatar === 'string' && avatar ? avatar : null,
        };
    } catch (e) {
        return null;
    }
}

function slotGroupNameCache(slot) {
    if (!slot.groupNameById || typeof slot.groupNameById !== 'object') {
        slot.groupNameById = {};
    }
    return slot.groupNameById;
}

function extractGroupSenderUid(rawD) {
    if (!rawD || typeof rawD !== 'object') {
        return '';
    }
    const v =
        rawD.uidFrom ??
        rawD.fromUid ??
        rawD.from_uid ??
        rawD.senderId ??
        rawD.sender_id ??
        rawD.senderUid ??
        rawD.sender_uid ??
        rawD.userId ??
        rawD.user_id ??
        rawD.ownerId ??
        rawD.owner_id ??
        '';
    const s = String(v ?? '').trim();
    return s && s !== '0' ? s : '';
}

function extractGroupSenderDisplayName(rawD) {
    if (!rawD || typeof rawD !== 'object') {
        return '';
    }
    const keys = ['dName', 'displayName', 'zaloName', 'display_name', 'zalo_name', 'name'];
    for (const key of keys) {
        const name = String(rawD[key] ?? '').trim();
        if (name && name !== '0') {
            return name;
        }
    }
    return '';
}

async function dedupeRestoredSessionsByPersonalUid(restored) {
    const byUid = new Map();
    for (const { id, personalUid } of restored) {
        const uid = String(personalUid ?? '').trim();
        if (!uid) {
            continue;
        }
        const prev = byUid.get(uid);
        if (!prev || id > prev) {
            byUid.set(uid, id);
        }
    }
    for (const { id, personalUid } of restored) {
        const uid = String(personalUid ?? '').trim();
        if (!uid) {
            continue;
        }
        const keepId = byUid.get(uid);
        if (keepId && id !== keepId) {
            console.warn('zalo-bridge: removing stale duplicate session on boot', {
                personalUid: uid,
                staleConnectionId: id,
                keepConnectionId: keepId,
            });
            await clearSlot(String(id));
        }
    }
}

function isPlaceholderSenderName(name, senderUid, groupName = '') {
    const n = String(name ?? '').trim();
    if (!n || n === 'Zalo User') {
        return true;
    }
    if (senderUid && n === String(senderUid)) {
        return true;
    }
    return Boolean(groupName && n.toLowerCase() === String(groupName).toLowerCase());
}

async function resolveGroupProfile(api, groupId) {
    if (!api?.getGroupInfo || !groupId) {
        return null;
    }
    try {
        const gid = String(groupId);
        const gi = await api.getGroupInfo(gid);
        let info = gi?.gridInfoMap?.[gid];
        if (!info && gi?.gridInfoMap && typeof gi.gridInfoMap === 'object') {
            const keys = Object.keys(gi.gridInfoMap);
            if (keys.length) {
                info = gi.gridInfoMap[keys[0]];
            }
        }
        if (!info) {
            return null;
        }
        const name = info?.name ? String(info.name) : '';
        const rawAv = info?.fullAvt || info?.avt;
        const avatar = rawAv ? String(rawAv) : null;
        return {
            name: name || String(groupId),
            avatar,
        };
    } catch {
        return null;
    }
}

/**
 * Build payload inbound đơn giản cho backfill nhóm từ getGroupChatHistory.
 * Không resolve profile async (tốc độ backfill > độ đầy đủ profile).
 * source_id deterministic qua deriveInboundSourceId (C-2).
 * is_self theo uid thật (C-1).
 * P12: threadType=0 cho old_messages 1-1 (relay-forwarder) — mặc định 1 giữ
 * nguyên hành vi group backfill/resync cũ.
 */
function buildGroupBackfillPayload(slot, groupId, rawD, isSelf, threadType = 1) {
    const cid = slot._connectionId; // gắn khi startListenerForSlot
    const bid = slot.botId;
    if (!cid || !bid) return null;

    const sourceId = deriveInboundSourceId('zalo_personal', slot.personalUid, groupId, rawD);
    const ts = rawD?.ts ?? rawD?.msgTs ?? rawD?.sendTime ?? rawD?.clientTime;
    const platformSentAt = Number.isFinite(Number(ts)) && Number(ts) > 0 ? Math.round(Number(ts)) : Date.now();

    // Suy ra content/inbound_kind từ rawD trực tiếp (history không qua parseInboundDescriptor)
    const contentRaw = rawD?.content;
    const contentStr = typeof contentRaw === 'string' ? contentRaw : JSON.stringify(contentRaw ?? '');
    const mediaUrl = typeof contentRaw === 'object' ? (contentRaw?.href ?? contentRaw?.url ?? null) : null;

    const payload = {
        connection_id: cid,
        bot_id: bid,
        personal_uid: slot.personalUid,
        peer_uid: groupId,
        thread_id: groupId,
        thread_type: threadType,
        source_id: sourceId,
        is_self: isSelf,
        direction: isSelf ? 'out' : 'in',  // backfill không check echo (không có outboundEchoIds context)
        user: { name: null, avatar: null }, // profile không resolve khi backfill
        platform_sent_at: platformSentAt,
        inbound_kind: mediaUrl ? 'media' : 'text',
        content: contentStr,
        backfill: true,          // marker để Laravel biết đây là tin hồi phục (không gửi notification)
    };
    if (mediaUrl) payload.media_url = mediaUrl;
    if (!isSelf && rawD?.uidFrom) payload.sender_uid = String(rawD.uidFrom);

    return payload;
}

function startListenerForSlot(slotKey) {
    const slot = getSlot(slotKey);
    if (!slot.api || slot.listenerStarted) {
        return;
    }
    if (isQrSlotKey(slotKey)) {
        console.error('bridge: refuse listener on qr slot', slotKey);
        return;
    }
    slot.listenerStarted = true;
    slot._connectionId = Number(slotKey); // cho buildGroupBackfillPayload
    const cid = Number(slotKey);
    const bid = slot.botId;

    if (typeof slot.api.listener?.on === 'function') {
        try {
            slot.api.listener.on('error', (err) => {
                slot.loginPhase = 'session_lost';
                slot.sessionLostReason = err?.message || String(err || 'listener_error');
                slot.sessionLostAt = Date.now(); // cho computeGapMs khi reconnect
                console.warn('zalo-bridge: listener error connection_id=', cid, slot.sessionLostReason);
                postBridgeSession({
                    connection_id: cid,
                    bot_id: bid,
                    state: 'session_lost',
                    detail: slot.sessionLostReason,
                }).catch(() => {});
            });
        } catch (e) {
            console.warn('zalo-bridge: listener.on(error) not available', e?.message || e);
        }
        try {
            slot.api.listener.on('closed', (code, reason) => {
                if (code === CloseReason.KickConnection || code === CloseReason.DuplicateConnection) {
                    slot.loginPhase = 'session_lost';
                    slot.sessionLostReason = `ws_closed_${code}_${reason || ''}`;
                    slot.sessionLostAt = Date.now(); // cho computeGapMs khi reconnect
                    console.warn('zalo-bridge: listener closed (other session?)', cid, slot.sessionLostReason);
                    postBridgeSession({
                        connection_id: cid,
                        bot_id: bid,
                        state: 'session_lost',
                        detail: slot.sessionLostReason,
                    }).catch(() => {});
                }
            });
        } catch (e) {
            console.warn('zalo-bridge: listener.on(closed) not available', e?.message || e);
        }
        try {
            slot.api.listener.on('group_event', (ev) => {
                try {
                    if (!bid || !slot.personalUid) {
                        return;
                    }
                    const evPlain = JSON.parse(
                        JSON.stringify({
                            type: ev?.type,
                            act: ev?.act,
                            threadId: ev?.threadId,
                            isSelf: ev?.isSelf,
                            data: ev?.data,
                        })
                    );
                    const act = ev?.act != null ? String(ev.act) : '';
                    const threadId = ev?.threadId != null ? String(ev.threadId) : '';
                    void postZaloPersonalSocialEvent({
                        type: 'social_event',
                        social_kind: 'group_event',
                        bot_id: bid,
                        connection_id: cid,
                        personal_uid: String(slot.personalUid),
                        act,
                        thread_id: threadId,
                        event: evPlain,
                        source_id: zaloPersonalSocialSourceId(slot.personalUid, 'group_event', act, threadId, evPlain),
                    });
                } catch (e2) {
                    console.error('zalo-bridge: group_event forward failed', e2?.message || e2);
                }
            });
        } catch (e) {
            console.warn('zalo-bridge: listener.on(group_event) not available', e?.message || e);
        }
        try {
            slot.api.listener.on('friend_event', (ev) => {
                try {
                    if (!bid || !slot.personalUid) {
                        return;
                    }
                    const evPlain = JSON.parse(
                        JSON.stringify({
                            type: ev?.type,
                            threadId: ev?.threadId,
                            isSelf: ev?.isSelf,
                            data: ev?.data,
                        })
                    );
                    const threadId = ev?.threadId != null ? String(ev.threadId) : '';
                    void postZaloPersonalSocialEvent({
                        type: 'social_event',
                        social_kind: 'friend_event',
                        bot_id: bid,
                        connection_id: cid,
                        personal_uid: String(slot.personalUid),
                        act: '',
                        thread_id: threadId,
                        event: evPlain,
                        source_id: zaloPersonalSocialSourceId(slot.personalUid, 'friend_event', '', threadId, evPlain),
                    });
                } catch (e2) {
                    console.error('zalo-bridge: friend_event forward failed', e2?.message || e2);
                }
            });
        } catch (e) {
            console.warn('zalo-bridge: listener.on(friend_event) not available', e?.message || e);
        }
    }

    slot.api.listener.on('message', (message) => {
        if (!isSupportedThread(message)) {
            return;
        }
        void (async () => {
            const desc = parseInboundDescriptor(message);
            if (!desc) {
                return;
            }
            const threadId = String(message.threadId ?? '');
            const ttNum = Number(message?.type) === 1 ? 1 : 0;
            const peerUid = ttNum === 1 ? threadId : desc.peerUid || threadId;
            const rawD = message?.data;
            const tsMs0 =
                rawD && typeof rawD === 'object'
                    ? Number(rawD.ts ?? rawD.msgTs ?? rawD.sendTime ?? rawD.clientTime)
                    : NaN;
            const platformSentAt =
                Number.isFinite(tsMs0) && tsMs0 > 0 ? Math.round(tsMs0) : Date.now();
            // C-2/P06: dùng deriveInboundSourceId — không bao giờ Date.now() fallback, không connectionId
            const sourceId = deriveInboundSourceId('zalo_personal', slot.personalUid, threadId, message?.data);
            if (!bid) {
                console.error('bridge: bot_id missing for slot', cid);
                return;
            }

            let name = mapUserName(message);
            let avatar = null;
            let sender = null;
            let senderUidForPayload = '';
            if (ttNum === 1) {
                const cache = slotGroupNameCache(slot);
                const cached = cache[threadId];
                if (cached && typeof cached === 'object') {
                    if (cached.name) {
                        name = cached.name;
                    }
                    if (cached.avatar) {
                        avatar = cached.avatar;
                    }
                }

                const prof = await resolveGroupProfile(slot.api, threadId);
                if (prof?.name) {
                    name = prof.name;
                }
                if (prof?.avatar) {
                    avatar = prof.avatar;
                }
                if (prof && (cache[threadId]?.name !== prof.name || cache[threadId]?.avatar !== prof.avatar)) {
                    cache[threadId] = prof;
                }

                const senderUid = extractGroupSenderUid(rawD);
                if (senderUid && senderUid !== threadId) {
                    senderUidForPayload = senderUid;
                    const fromListener = extractGroupSenderDisplayName(rawD);
                    const sp = await resolvePeerProfile(slot.api, senderUid);
                    let senderName = sp?.name || '';
                    if (isPlaceholderSenderName(senderName, senderUid, name)) {
                        senderName = fromListener;
                    }
                    if (isPlaceholderSenderName(senderName, senderUid, name)) {
                        senderName = senderUid;
                    }
                    sender = {
                        id: senderUid,
                        name: senderName,
                        avatar: sp?.avatar || null,
                    };
                }
            } else {
                const prof = await resolvePeerProfile(slot.api, peerUid);
                name = prof?.name ?? name;
                avatar = prof?.avatar ?? null;
            }

            // C-1: ưu tiên so sánh uid thật; fallback message.isSelf nếu personalUid chưa có
            const isSelf = slot.personalUid
                ? String(rawD?.uidFrom ?? '') === String(slot.personalUid)
                : Boolean(message.isSelf);
            const payload = {
                connection_id: cid,
                bot_id: bid,
                personal_uid: slot.personalUid,
                peer_uid: peerUid,
                thread_id: threadId,
                thread_type: ttNum,
                source_id: sourceId,
                is_self: isSelf,
                user: {
                    name,
                    avatar,
                },
                platform_sent_at: platformSentAt,
                inbound_kind: desc.inbound_kind,
                msg_type: desc.msgType || null,
            };
            if (!isSelf && senderUidForPayload) {
                payload.sender_uid = senderUidForPayload;
                if (sender && sender.id) {
                    payload.sender = sender;
                }
            }
            if (isSelf) {
                payload.bridge_outbound_echo = consumeBridgeOutboundEcho(slot, sourceId);
            }

            // F14 — direction signal cho metering:
            //   'in'   = contact gửi đến (không meter)
            //   'echo' = bridge dội lại tin CRM vừa gửi (không meter — tránh double-count)
            //   'out'  = tenant gửi từ phone cá nhân (meter)
            // Fail-safe: thiếu tín hiệu → 'in' (under-count an toàn hơn over-count billing)
            if (!isSelf) {
                payload.direction = 'in';
            } else if (payload.bridge_outbound_echo === true) {
                payload.direction = 'echo';
            } else {
                payload.direction = 'out';
            }

            if (rawD && typeof rawD === 'object') {
                try {
                    payload.listener_data = JSON.parse(JSON.stringify(rawD));
                } catch {
                    payload.listener_data = null;
                }
            }

            const quoteInfo = extractQuoteFromListenerMessage(message);
            logZaloQuoteInspect(message, quoteInfo);
            if (quoteInfo) {
                if (quoteInfo.quote_msg_id) {
                    payload.quote_msg_id = quoteInfo.quote_msg_id;
                }
                if (quoteInfo.quote && Object.keys(quoteInfo.quote).length) {
                    payload.quote = quoteInfo.quote;
                }
            }

            const quoteRelated =
                !!quoteInfo ||
                (rawD &&
                    typeof rawD === 'object' &&
                    (rawD.quote || rawD.quoteMsg || rawD.propertyExt || rawD.quoteMsgId || rawD.quote_msg_id));
            if (quoteRelated) {
                payload.listener_message = {
                    threadId: message.threadId,
                    type: message.type,
                    isSelf: message.isSelf,
                    quote: message.quote ?? null,
                };
            }

            if (desc.inbound_kind === 'text') {
                payload.content = desc.text;
            } else if (desc.inbound_kind === 'sticker') {
                payload.sticker = await resolveStickerForWebhook(slot.api, desc.sticker);
            } else if (desc.inbound_kind === 'business_card') {
                payload.business_card = await resolveBusinessCardForWebhook(slot.api, desc.business_card, message);
                payload.content = desc.caption != null ? String(desc.caption) : '';
            } else if (desc.inbound_kind === 'call') {
                payload.call = desc.call;
                payload.content = '';
            } else {
                payload.media_url = desc.media_url;
                if (desc.media_filename) {
                    payload.media_filename = desc.media_filename;
                }
                payload.content = desc.caption != null ? String(desc.caption) : '';
            }

            postInbound(payload).catch((e) => console.error('postInbound', e));
        })();
    });

    // P12: forwarder generic — subscribe 10 event chưa wired (né 5 bespoke +
    // cipher_key, B3/B6); guard slot.forwarderAttached bên trong (MED-2).
    const relayEvents = attachRelayForwarder(slot, {
        enqueue: (body) => outbox.enqueue(body),
        postFireAndForget: postRelayFireAndForget,
        buildInboundPayload: buildGroupBackfillPayload,
    });
    if (relayEvents.length > 0) {
        console.info('zalo-bridge: relay forwarder attached connection_id=', cid, 'events=', relayEvents.join(','));
    }

    slot.api.listener.start();
    console.info('zalo-bridge: listener started connection_id=', cid, 'bot_id=', bid);
}

async function clearSlot(slotKey) {
    const slot = getSlot(slotKey);
    try {
        if (slot.api?.listener) {
            slot.api.listener.stop();
        }
    } catch (e) {
        console.warn('bridge: listener.stop', e?.message || e);
    }
    Object.assign(slot, createSlotState());
    const cp = slotCookiePathForKey(slotKey);
    if (existsSync(cp)) {
        await fs.unlink(cp).catch(() => {});
    }
    const mp = slotMetaPathForKey(slotKey);
    if (existsSync(mp)) {
        await fs.unlink(mp).catch(() => {});
    }
    slots.delete(String(slotKey));
}

async function promoteQrToConnection(qrKey, connectionId, workspaceId = '') {
    const slot = slots.get(qrKey);
    if (!slot?.api || slot.loginPhase !== 'ready' || !slot.personalUid) {
        return false;
    }
    const newKey = String(connectionId);
    if (slots.has(newKey)) {
        const existing = slots.get(newKey);
        if (existing?.api && existing.loginPhase === 'ready') {
            console.warn('promote: target slot occupied', connectionId);
            return false;
        }
        await clearSlot(newKey);
    }
    try {
        if (slot.listenerStarted && slot.api?.listener) {
            slot.api.listener.stop();
        }
    } catch (e) {
        console.warn('promote listener stop', e?.message || e);
    }
    slot.listenerStarted = false;
    const oldCp = slotCookiePathForKey(qrKey);
    const newCp = slotCookiePathForKey(newKey);
    const oldMp = slotMetaPathForKey(qrKey);
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    if (existsSync(oldCp)) {
        await fs.copyFile(oldCp, newCp);
        await fs.unlink(oldCp).catch(() => {});
    }
    if (existsSync(oldMp)) {
        await fs.unlink(oldMp).catch(() => {});
    }
    // P11/B1: bind connection→workspace tại promote (nơi DUY NHẤT ghi binding —
    // workspace_id từ SESSION Laravel đã auth, không từ connection row). Persist
    // vào meta để tryLoginWithSavedSession khôi phục sau restart (review NEW-2).
    slot.workspaceId = String(workspaceId || '');
    await writeSlotMetaForKey(newKey, { bot_id: slot.botId, workspace_id: slot.workspaceId });
    slots.delete(qrKey);
    slots.set(newKey, slot);
    startListenerForSlot(newKey);
    void refreshIntegratedProfile(slot);
    if (slot.botId) {
        postBridgeSession({ connection_id: connectionId, bot_id: slot.botId, state: 'session_ok' }).catch(() => {});
    }
    // Tier 2: backfill khi promote QR (lần đầu kết nối — gapMs null, backfill cần nếu mất kết nối trước)
    void backfillOnReconnect(slot, {
        enqueue: (body) => outbox.enqueue(body),
        buildInboundPayload: buildGroupBackfillPayload,
        gapMs: computeGapMs(slot),
    });
    console.info('Zalo bridge: promoted', qrKey, '->', connectionId);
    return true;
}

async function tryLoginWithSavedSession(connectionId) {
    const key = String(connectionId);
    const cp = slotCookiePathForKey(key);
    if (!existsSync(cp)) {
        return false;
    }
    const slot = getSlot(key);
    try {
        const raw = await fs.readFile(cp, 'utf8');
        const creds = JSON.parse(raw);
        if (!creds?.cookie || !creds?.imei || !creds?.userAgent) {
            return false;
        }
        const meta = await readSlotMetaForKey(key);
        if (meta?.bot_id) {
            slot.botId = Number(meta.bot_id);
        }
        // P11/B1: khôi phục workspace binding sau restart — thiếu thì dispatcher
        // /zca fail-closed 403 (workspace_binding_missing) cho tới khi re-promote.
        if (meta?.workspace_id) {
            slot.workspaceId = String(meta.workspace_id);
        }
        const zalo = new Zalo(ZALO_OPTIONS);
        slot.api = await zalo.login({
            cookie: creds.cookie,
            imei: creds.imei,
            userAgent: creds.userAgent,
            language: 'vi',
        });
        slot.personalUid = String(slot.api.getOwnId());
        slot.loginPhase = 'ready';
        slot.sessionLostReason = null;
        console.info('Zalo bridge: restored session connection_id=', connectionId, 'uid=', slot.personalUid);
        startListenerForSlot(key);
        void refreshIntegratedProfile(slot);
        if (slot.botId) {
            postBridgeSession({ connection_id: connectionId, bot_id: slot.botId, state: 'session_ok' }).catch(() => {});
        }
        // Tier 2: backfill tin nhóm trong gap kể từ lần session_lost (nếu có)
        void backfillOnReconnect(slot, {
            enqueue: (body) => outbox.enqueue(body),
            buildInboundPayload: buildGroupBackfillPayload,
            gapMs: computeGapMs(slot),
        });
        return true;
    } catch (e) {
        console.warn('Saved session login failed connection_id=', connectionId, e?.message || e);
        return false;
    }
}

const bridgeAttachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 32 * 1024 * 1024 },
});

// P04: fetch media qua media-fetch.mjs (byte-cap + host allowlist — Codex MED).
// Allowlist mặc định = host Laravel (signed URL private disk) + env mở rộng.
const FETCH_ALLOWED_HOSTS = buildAllowedHosts({
    laravelWebhookUrl: LARAVEL_WEBHOOK_URL,
    extraCsv: process.env.BRIDGE_FETCH_HOST_ALLOWLIST,
});

/**
 * Đăng ký TẤT CẢ msgId của 1 lần send vào echo-dedup (file+caption = 2 msgId,
 * Codex MED-7) và trả {source_id: primary, source_ids: all} cho Laravel ghi alias.
 */
function registerAllOutboundSourceIds(slot, sendResult) {
    const ids = collectSourceIdsFromSendResult(sendResult);
    for (const id of ids) {
        registerBridgeOutboundSourceId(slot, id);
    }
    return { source_id: ids[0] ?? null, source_ids: ids };
}

function checkSendSecret(req, res) {
    // F10-audit: fail-CLOSED — secret rỗng → từ chối thay vì bypass.
    if (!BRIDGE_SEND_SECRET) {
        res.status(503).json({ ok: false, error: 'bridge secret not configured' });
        return false;
    }
    const h = req.header('X-Bridge-Send-Secret') || '';
    if (h !== BRIDGE_SEND_SECRET) {
        res.status(403).json({ ok: false, message: 'Forbidden' });
        return false;
    }
    return true;
}

async function bridgeSendTextOrMedia(slot, body) {
    const { thread_id, thread_type, text, file_url, media_kind, filename } = body || {};
    if (!thread_id) {
        throw new Error('thread_id required');
    }
    const tt = Number(thread_type) === 1 ? ThreadType.Group : ThreadType.User;
    const fileUrl = typeof file_url === 'string' ? file_url.trim() : '';
    const hasFile = fileUrl !== '';

    if (!hasFile && (text === undefined || text === null)) {
        throw new Error('thread_id and text or file_url required');
    }
    if (hasFile) {
        const mk = String(media_kind || '')
            .trim()
            .toLowerCase();
        if (!['image', 'gif', 'video', 'audio', 'file'].includes(mk)) {
            throw new Error('invalid media_kind');
        }
    }
    let tmpPath = null;
    try {
        if (hasFile) {
            const mk = String(media_kind || '')
                .trim()
                .toLowerCase();
            tmpPath = await downloadUrlToTemp(fileUrl, {
                allowedHosts: FETCH_ALLOWED_HOSTS,
                userAgent: ZCA_USER_AGENT,
                mediaKind: mk,
                filenameHint: typeof filename === 'string' ? filename : null,
            });
            const cap = text != null && String(text).trim() !== '' ? String(text) : '';
            const sendResult = await slot.api.sendMessage({ msg: cap, attachments: [tmpPath] }, String(thread_id), tt);
            return registerAllOutboundSourceIds(slot, sendResult);
        }
        const sendResult = await slot.api.sendMessage({ msg: String(text) }, String(thread_id), tt);
        return registerAllOutboundSourceIds(slot, sendResult);
    } finally {
        if (tmpPath) {
            await fs.unlink(tmpPath).catch(() => {});
        }
    }
}

function buildExpress() {
    const app = express();
    app.use(express.json({ limit: '4mb' }));

    const rootOk = (_req, res) => {
        res.status(200).type('text/plain').send('OK');
    };
    app.get('/', rootOk);
    app.head('/', rootOk);

    app.get('/health', (req, res) => {
        const slotKey = slotKeyFromRequest(req);
        if (!slotKey) {
            return res.status(400).json({ ok: false, message: 'connection_id or qr_token required' });
        }
        const qBot = req.query.bot_id != null && req.query.bot_id !== '' ? Number(req.query.bot_id) : null;
        const slot = getSlot(slotKey);
        if (qBot !== null && qBot > 0) {
            slot.botId = qBot;
            void writeSlotMetaForKey(slotKey, { bot_id: qBot });
        }
        const sessionBotMatch = qBot === null || qBot === 0 || qBot === slot.botId;
        const sessionActive = Boolean(slot.api) && slot.loginPhase === 'ready' && Boolean(slot.personalUid);
        const connected = sessionActive && sessionBotMatch;
        const out = {
            ok: true,
            phase: slot.loginPhase,
            personal_uid: slot.personalUid || null,
            integrated_display_name: slot.integratedDisplayName || null,
            integrated_avatar: slot.integratedAvatar || null,
            connected,
            session_active: sessionActive,
            bot_id_match: sessionBotMatch,
            active_bot_id: slot.botId,
            bot_id: slot.botId,
            laravel_webhook_configured: Boolean(LARAVEL_WEBHOOK_URL),
            session_lost: slot.loginPhase === 'session_lost',
            session_lost_reason: slot.sessionLostReason || null,
            // H-3 / M-4: outbox stats cho alert khi authBlocked hoặc queue tăng bất thường
            outbox: outbox.stats(),
        };
        if (isQrSlotKey(slotKey)) {
            out.qr_token = slotKey.slice(3);
        } else {
            out.connection_id = Number(slotKey);
        }
        res.json(out);
    });

    app.post('/auth/qr/start', (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const token = normalizeQrToken(req.body?.qr_token);
        const botId = Number(req.body?.bot_id || 0);
        if (!token || !botId) {
            return res.status(400).json({ ok: false, message: 'qr_token and bot_id required' });
        }
        const key = `qr:${token}`;
        const slot = getSlot(key);
        if (slot.api && slot.loginPhase === 'ready' && slot.personalUid) {
            slot.botId = botId;
            void writeSlotMetaForKey(key, { bot_id: botId });
            return res.json({
                ok: true,
                phase: 'ready',
                already: true,
                personal_uid: slot.personalUid,
                bot_id: slot.botId,
                qr_token: token,
            });
        }
        if (slot.loginPhase === 'logging_in' || slot.loginPhase === 'qr_waiting') {
            return res.status(409).json({ ok: false, message: 'login_in_progress' });
        }
        if (!LARAVEL_WEBHOOK_URL) {
            return res.status(400).json({ ok: false, message: 'bridge_missing_laravel_webhook_url' });
        }

        slot.botId = botId;
        void writeSlotMetaForKey(key, { bot_id: botId });
        slot.loginPhase = 'logging_in';
        slot.qrImageBase64 = null;
        slot.lastError = null;

        const cp = slotCookiePathForKey(key);

        (async () => {
            try {
                const zalo = new Zalo(ZALO_OPTIONS);
                slot.api = await zalo.loginQR({ userAgent: ZCA_USER_AGENT, language: 'vi' }, (evt) => {
                    if (evt.type === LoginQRCallbackEventType.QRCodeGenerated) {
                        slot.qrImageBase64 = evt.data?.image || null;
                        slot.loginPhase = 'qr_waiting';
                    }
                    if (evt.type === LoginQRCallbackEventType.GotLoginInfo && evt.data) {
                        fs.writeFile(cp, JSON.stringify(evt.data), 'utf8').catch(() => {});
                    }
                });
                slot.personalUid = String(slot.api.getOwnId());
                slot.loginPhase = 'ready';
                slot.sessionLostReason = null;
                await writeSlotMetaForKey(key, { bot_id: botId });
                void refreshIntegratedProfile(slot);
                console.info('Zalo bridge: QR login qr_token=', token, 'uid=', slot.personalUid);
            } catch (e) {
                slot.loginPhase = 'error';
                slot.lastError = e?.message || String(e);
                slot.api = null;
                console.error('QR login failed qr_token=', token, e);
            }
        })();

        return res.json({ ok: true, qr_token: token });
    });

    app.post('/auth/qr/promote', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const token = normalizeQrToken(req.body?.qr_token);
        const connectionId = Number(req.body?.connection_id || 0);
        if (!token || !connectionId) {
            return res.status(400).json({ ok: false, message: 'qr_token and connection_id required' });
        }
        const qrKey = `qr:${token}`;
        // P11/B1: workspace_id từ session Laravel đã auth (currentWorkspace) — bind vào slot
        const workspaceId = typeof req.body?.workspace_id === 'string' ? req.body.workspace_id.trim() : '';
        const ok = await promoteQrToConnection(qrKey, connectionId, workspaceId);
        if (!ok) {
            return res.status(400).json({ ok: false, message: 'promote_failed' });
        }
        // Load the freshly-connected slot + ensure its profile (name/avatar) is fetched
        // so Laravel can persist personal_uid/display_name/avatar on promote (no separate poll).
        const slot = getSlot(String(connectionId));
        try {
            await refreshIntegratedProfile(slot);
        } catch {
            /* profile enrichment is best-effort; uid is still returned */
        }
        return res.json({
            ok: true,
            connection_id: connectionId,
            personal_uid: slot?.personalUid || null,
            display_name: slot?.integratedDisplayName || null,
            avatar: slot?.integratedAvatar || null,
        });
    });

    app.post('/auth/qr/cancel', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const token = normalizeQrToken(req.body?.qr_token);
        if (!token) {
            return res.status(400).json({ ok: false, message: 'qr_token required' });
        }
        await clearSlot(`qr:${token}`);
        res.json({ ok: true });
    });

    app.post('/auth/logout', async (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const connectionId = Number(req.body?.connection_id || 0);
        if (!connectionId) {
            return res.status(400).json({ ok: false, message: 'connection_id required' });
        }
        await clearSlot(String(connectionId));
        res.json({ ok: true });
    });

    app.get('/auth/qr/status', (req, res) => {
        if (!checkUiSecret(req)) {
            return res.status(403).json({ ok: false, message: 'Forbidden' });
        }
        const slotKey = slotKeyFromRequest(req);
        if (!slotKey || !isQrSlotKey(slotKey)) {
            return res.status(400).json({ ok: false, message: 'qr_token required' });
        }
        const slot = getSlot(slotKey);
        const img = slot.qrImageBase64 ? `data:image/png;base64,${slot.qrImageBase64}` : null;
        res.json({
            ok: true,
            phase: slot.loginPhase,
            qr_image: img,
            error: slot.lastError,
            personal_uid: slot.personalUid || null,
            qr_token: slotKey.slice(3),
        });
    });

    app.post('/send/attachment', bridgeAttachmentUpload.single('file'), async (req, res) => {
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
        if (!req.file?.buffer?.length) {
            return res.status(400).json({ ok: false, message: 'file required' });
        }
        const { thread_id, thread_type, text, media_kind } = req.body || {};
        if (!thread_id) {
            return res.status(400).json({ ok: false, message: 'thread_id required' });
        }
        const mk = String(media_kind || '')
            .trim()
            .toLowerCase();
        if (!['image', 'gif', 'video', 'audio', 'file'].includes(mk)) {
            return res.status(400).json({ ok: false, message: 'invalid media_kind' });
        }
        const tt = Number(thread_type) === 1 ? ThreadType.Group : ThreadType.User;
        const cap = text != null && String(text).trim() !== '' ? String(text) : '';
        let tmpPath = null;
        try {
            let ext = extFromFilename(req.file.originalname);
            if (!ext) {
                const ct = (req.file.mimetype || '').split(';')[0].trim();
                ext = mimeToExt(ct) || MEDIA_KIND_DEFAULT_EXT[mk] || 'bin';
            }
            const safe = String(ext).replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
            tmpPath = path.join(tmpdir(), `zbr-${randomUUID()}.${safe}`);
            await fs.writeFile(tmpPath, req.file.buffer);
            const sendResult = await slot.api.sendMessage({ msg: cap, attachments: [tmpPath] }, String(thread_id), tt);
            const out = registerAllOutboundSourceIds(slot, sendResult);
            return res.json({ ok: true, source_id: out.source_id, source_ids: out.source_ids });
        } catch (e) {
            console.error('sendAttachment', e);
            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        } finally {
            if (tmpPath) {
                await fs.unlink(tmpPath).catch(() => {});
            }
        }
    });

    app.post('/send', async (req, res) => {
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
        try {
            const out = await bridgeSendTextOrMedia(slot, req.body || {});
            return res.json({ ok: true, source_id: out.source_id, source_ids: out.source_ids });
        } catch (e) {
            const msg = e?.message ? String(e.message) : String(e);
            if (
                msg === 'thread_id required' ||
                msg === 'thread_id and text or file_url required' ||
                msg === 'invalid media_kind'
            ) {
                return res.status(400).json({ ok: false, message: msg });
            }
            console.error('sendMessage', e);
            return res.status(500).json({ ok: false, message: msg });
        }
    });
    registerPersonalMessageRoutes(app, { checkSendSecret, getSlot, bridgeSendTextOrMedia });
    registerUiActionsRoutes(app, {
        checkUiSecret,
        getSlot,
        ThreadType,
        buildGroupBackfillPayload,
        enqueueOutbox: (body) => outbox.enqueue(body),
    });
    // P11: dispatcher generic — mount SAU các route active. resolve-only (M2):
    // slots.get, KHÔNG getSlot (get-or-create).
    registerZcaDispatchRoutes(app, {
        resolveSlot: (connectionId) => slots.get(String(connectionId)),
        sendSecret: BRIDGE_SEND_SECRET,
        elevatedSecret: BRIDGE_ELEVATED_SECRET,
    });

    return app;
}

async function bootRestoreAllSessions() {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    let files = [];
    try {
        files = readdirSync(SESSIONS_DIR);
    } catch {
        return;
    }
    const ids = new Set();
    for (const f of files) {
        const m = /^c(\d+)\.json$/.exec(f);
        if (m) {
            ids.add(Number(m[1]));
        }
    }
    const restored = [];
    for (const id of ids) {
        const ok = await tryLoginWithSavedSession(id);
        if (ok) {
            const slot = getSlot(String(id));
            restored.push({ id, personalUid: slot.personalUid });
        }
    }
    await dedupeRestoredSessionsByPersonalUid(restored);
    if (ids.size > 0) {
        console.info('Zalo bridge: restored', restored.length, 'session slot(s)');
    }
}

/** Xóa file tạm quét QR (qt_*) quá hạn — tránh thư mục .sessions phình khi bỏ dở QR. File c{connectionId}.json chỉ xóa qua POST /auth/logout khi Laravel gỡ kết nối. */
async function cleanupStaleQrSessionFiles() {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    let files = [];
    try {
        files = readdirSync(SESSIONS_DIR);
    } catch {
        return;
    }
    const maxAgeMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const f of files) {
        if (!f.startsWith('qt_')) {
            continue;
        }
        const p = path.join(SESSIONS_DIR, f);
        try {
            const st = await fs.stat(p);
            if (now - st.mtimeMs > maxAgeMs) {
                await fs.unlink(p).catch(() => {});
            }
        } catch {
            // ignore
        }
    }
}

async function boot() {
    // F10-audit: startup guard — thiếu secret trong production → từ chối boot.
    if (process.env.NODE_ENV === 'production') {
        const missing = [];
        if (!BRIDGE_SEND_SECRET) missing.push('BRIDGE_SEND_SECRET');
        if (!BRIDGE_UI_SECRET) missing.push('BRIDGE_UI_SECRET');
        if (missing.length > 0) {
            console.error(`[bridge] FATAL: missing required env vars in production: ${missing.join(', ')}. Refusing to start.`);
            process.exit(1);
        }
    }

    await cleanupStaleQrSessionFiles();
    await bootRestoreAllSessions();
    outbox.start(); // Tier 1: drain outbox còn lại từ lần chạy trước, rồi setInterval
    setInterval(() => {
        cleanupStaleQrSessionFiles().catch(() => {});
    }, 6 * 60 * 60 * 1000);
    const app = buildExpress();
    app.listen(BRIDGE_HTTP_PORT, '0.0.0.0', () => {
        console.info(
            `Zalo personal bridge (multi-session) listening on 0.0.0.0:${BRIDGE_HTTP_PORT} — GET / or HEAD / returns 200 OK`
        );
    });
}

boot().catch((e) => {
    console.error(e);
    process.exit(1);
});
