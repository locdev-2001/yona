/**
 * zca-adapter.mjs — cơ chế GENERIC sở hữu 100% bề mặt zca-js (P11, port nguyên
 * từ .lab/ prototype đã validate LAB session thật 2026-07-04 — KHÔNG sửa logic).
 * KHÔNG hand-wire từng API. Nâng zca-js → method/event mới tự lộ; method mới
 * chưa phân tier bị test snapshot (zca-adapter.test.mjs, M1) chặn build.
 *
 * 3 phần: buildAllowlist (reflection) · invokeMethod (dispatcher core) ·
 * attachEventForwarder (subscribe cả 16 event, không vứt event nào).
 */

// 16 event — single source, mirror ListenerEvents trong zca-js/src/apis/listen.ts.
// ponytail: hard-code list vì enum không export runtime; 1 chỗ, khớp .d.ts.
export const ZCA_EVENTS = [
    'connected', 'disconnected', 'closed', 'error', 'typing', 'message',
    'old_messages', 'seen_messages', 'delivered_messages', 'reaction',
    'old_reactions', 'upload_attachment', 'undo', 'friend_event', 'group_event', 'cipher_key',
];

// 5 event ĐÃ có handler bespoke trong src/index.mjs (mang side-effect local: echo dedup,
// gap/session state, profile enrich, direction F14). Forwarder generic PHẢI né 5 cái này —
// nếu không, EventEmitter gọi 2 listener → double-ingest/422 (redteam-02 CRITICAL #1).
export const WIRED_EVENTS = new Set(['message', 'error', 'closed', 'group_event', 'friend_event']);

// Method nhận Buffer/file path → KHÔNG JSON-serializable → phải đi multipart riêng,
// và bị chặn ở JSON dispatcher (chống path-traversal qua args). Nguồn: researcher-01.
export const MEDIA_METHODS = new Set([
    'uploadAttachment', 'uploadProductPhoto', 'sendVideo', 'sendVoice',
    'changeAccountAvatar', 'changeGroupAvatar',
]);

// Method trả binary (ArrayBuffer) → không JSON hoá, cần đường stream riêng.
export const BINARY_METHODS = new Set(['getFullAvatar']);

// DENY-list: method THẬT của api nhưng nguy hiểm bản chất → chặn cứng khỏi dispatcher.
// custom() = gọi REST Zalo tùy ý (bypass toàn bộ allowlist/SSRF); getCookie/getContext lộ session.
export const ADAPTER_DENY = new Set(['custom', 'getCookie', 'getContext']);

// Method TẠO TIN outbound (metered) → CẤM khỏi dispatcher generic; phải đi đường
// /personal-messages/send (outbox durable + echo dedup registerBridgeOutboundSourceId +
// source_id). Nếu lọt → echo selfListen thành direction=out → meter nhầm tin CRM (F14).
// redteam-02 CRITICAL #2.
export const OUTBOUND_SEND_METHODS = new Set([
    'sendMessage', 'sendSticker', 'sendCard', 'sendBankCard', 'sendLink', 'forwardMessage',
]);

// DESTRUCTIVE (39) → CẤM ở dispatcher trừ khi có elevated secret riêng. Defense-in-depth:
// 1 send-secret rò rộng KHÔNG được cấp quyền giải tán/khoá/chiếm nhóm, xoá tin, cắm auto-reply,
// thêm-người-lạ vào nhóm. Gate quyền THẬT vẫn ở Laravel RBAC; đây là lớp chặn thứ 2 ở bridge.
// Đã đối chiếu ĐỦ 146 method (`.lab/audit-classification.mjs` liệt kê MỌI mutation, không dựa regex).
// Nguyên tắc gate: ảnh hưởng nhóm/người-khác/persistent-send/bất-khả-hồi. Để DISPATCH_OK có ý thức:
// config CÁ NHÂN account (profile/mute/label/quickMessage/setting/reminder), poll/catalog/note
// (reversible phạm vi hẹp), self-join nhóm, friend-request (rate-limit ở product layer).
export const DESTRUCTIVE_METHODS = new Set([
    'removeFriend', 'blockUser', 'unblockUser', 'rejectFriendRequest', 'undoFriendRequest',
    'disperseGroup', 'leaveGroup', 'removeUserFromGroup', 'removeGroupBlockedMember',
    'removeGroupDeputy', 'deleteGroupInviteBox', 'deleteMessage', 'undo', 'deleteChat',
    'deleteCatalog', 'deleteProductCatalog', 'deleteAutoReply', 'removeReminder',
    'removeQuickMessage', 'removeUnreadMark', 'resetHiddenConversPin', 'updateHiddenConversPin',
    'deleteAvatar', 'blockViewFeed', 'upgradeGroupToCommunity',
    // review HIGH-1/2 (bất khả hồi / trao quyền admin / mất tin / group-integrity):
    'changeGroupOwner', 'addGroupDeputy', 'addGroupBlockedMember', 'changeGroupName',
    'enableGroupLink', 'disableGroupLink', 'updateAutoDeleteChat',
    // re-review NEW-1 (disruption/infiltration/persistent-send nhóm & người khác):
    'updateGroupSettings', 'reviewPendingMemberRequest', 'addUserToGroup', 'inviteUserToGroups',
    'createAutoReply', 'updateAutoReply', 'setHiddenConversations',
]);

// Event KHÔNG forward: 5 đã wired bespoke + cipher_key (khoá session — rò key material nếu
// forward raw sang Laravel/log, redteam-01 V7). Forwarder generic chỉ phủ event còn lại.
export const NO_FORWARD_EVENTS = new Set([...WIRED_EVENTS, 'cipher_key']);

// Chặn arg-DoS thô (payload khổng lồ → memory blowup / zca gửi request nặng). redteam-01 V4.
const MAX_ARGS_JSON_BYTES = 64 * 1024;

// Field trong args mang tham chiếu file phía server → cấm ở JSON dispatch (traversal).
const FILE_ARG_FIELDS = new Set(['attachments', 'attachment', 'filePath', 'path', 'file']);

/**
 * Allowlist = method THẬT của api, reflect own + prototype. Loại Object kế thừa,
 * private (_*), constructor. `method in api` KHÔNG đủ (leo prototype chain tới Object).
 */
export function buildAllowlist(api) {
    const names = new Set();
    let obj = api;
    // đi tối đa 3 tầng (instance + prototype trực tiếp), dừng trước Object.prototype
    for (let depth = 0; depth < 3 && obj && obj !== Object.prototype; depth++) {
        for (const n of Object.getOwnPropertyNames(obj)) {
            if (n === 'constructor' || n.startsWith('_')) continue;
            let val;
            try { val = api[n]; } catch { continue; } // getter ném → bỏ qua
            if (typeof val === 'function') names.add(n);
        }
        obj = Object.getPrototypeOf(obj);
    }
    return names;
}

/** Args chứa field tham chiếu file → chặn (media phải qua multipart, không JSON). */
export function argsCarryFileRef(args) {
    const scan = (v, d = 0) => {
        if (d > 4 || v == null || typeof v !== 'object') return false;
        for (const k of Object.keys(v)) {
            if (FILE_ARG_FIELDS.has(k)) return true;
            if (scan(v[k], d + 1)) return true;
        }
        return false;
    };
    return Array.isArray(args) && args.some((a) => scan(a));
}

/**
 * Core dispatcher: gọi method THẬT qua reflection, có gác.
 * Ném Error kèm .code để caller map HTTP status.
 */
export function invokeMethod(api, allowlist, method, args, { elevated = false } = {}) {
    if (typeof method !== 'string' || !allowlist.has(method)) {
        throw Object.assign(new Error(`method_not_allowed: ${method}`), { code: 'METHOD_NOT_ALLOWED' });
    }
    if (ADAPTER_DENY.has(method)) {
        throw Object.assign(new Error(`method_denied: ${method}`), { code: 'METHOD_DENIED' });
    }
    if (OUTBOUND_SEND_METHODS.has(method)) {
        throw Object.assign(new Error(`use_send_endpoint: ${method}`), { code: 'OUTBOUND_USE_SEND_ENDPOINT' });
    }
    if (DESTRUCTIVE_METHODS.has(method) && !elevated) {
        throw Object.assign(new Error(`destructive_needs_elevated: ${method}`), { code: 'DESTRUCTIVE_DENIED' });
    }
    if (!Array.isArray(args)) {
        throw Object.assign(new Error('args_must_be_array'), { code: 'BAD_ARGS' });
    }
    if (MEDIA_METHODS.has(method) || BINARY_METHODS.has(method)) {
        throw Object.assign(new Error(`media_needs_special_route: ${method}`), { code: 'MEDIA_SPECIAL_ONLY' });
    }
    if (argsCarryFileRef(args)) {
        throw Object.assign(new Error('file_ref_in_json_args_forbidden'), { code: 'FILE_REF_FORBIDDEN' });
    }
    if (JSON.stringify(args).length > MAX_ARGS_JSON_BYTES) {
        throw Object.assign(new Error('args_too_large'), { code: 'ARGS_TOO_LARGE' });
    }
    return api[method](...args);
}

/**
 * Generic forwarder: subscribe các event CHƯA wired (né 5 bespoke + cipher_key) → sink(eventType, payload).
 * Trả về danh sách event đã subscribe (để test/verify). Event chưa có handler product vẫn
 * forward (Laravel log+lưu vào relay_events, KHÔNG vứt im lặng).
 */
export function attachEventForwarder(api, sink) {
    const subscribed = [];
    for (const evt of ZCA_EVENTS) {
        if (NO_FORWARD_EVENTS.has(evt)) continue;
        subscribed.push(evt);
        api.listener.on(evt, (...payload) => {
            try { sink(evt, payload); } catch { /* không bao giờ ném ngược vào emitter */ }
        });
    }
    return subscribed;
}
