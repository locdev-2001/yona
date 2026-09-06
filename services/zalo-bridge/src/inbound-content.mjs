/**
 * Label thân thiện cho content-object Zalo KHÔNG phải text/media thường
 * (zinstant.bankcard, webcontent, card...). Backfill lane dùng cái này thay
 * JSON.stringify(content) — nếu không, raw JSON lọt thẳng ra UI (bug 11/07:
 * tin "thẻ tài khoản" hiện `{"action":"zinstant.bankcard",...}`).
 *
 * Zinstant = template động render phía Zalo (title/href null, nội dung nằm sâu
 * trong params) → không tái dựng được ngoài Zalo, chỉ hiển thị nhãn.
 *
 * @param {unknown} content  rawD.content
 * @param {string} [msgType] rawD.msgType
 * @returns {string}
 */
export function contentLabelFromObject(content, msgType = '') {
    if (!content || typeof content !== 'object') {
        return '';
    }
    const action = String(content.action || '');
    if (action.startsWith('zinstant.')) {
        return action === 'zinstant.bankcard' ? '[Tài khoản ngân hàng]' : '[Thẻ Zalo]';
    }
    if (typeof content.title === 'string' && content.title.trim() !== '') {
        return content.title.trim();
    }
    const mt = String(msgType || '');
    if (mt === 'chat.webcontent' || mt === 'chat.link' || mt === 'chat.recommended') {
        return '[Liên kết]';
    }
    return '[Tin nhắn]';
}

// ── Chú thích ảnh/video/tệp ──────────────────────────────────────────────────
// Zalo để chú thích ngay trong content-object của tin media (`title`, đôi khi
// `description`). Đường cũ dựng chuỗi `[Link] <title> <href>` rồi lọc bỏ vì
// nhận nhầm là banner link ⇒ chú thích biến mất ở MỌI lane trong khi contract
// và fixture đều hứa `content` mang nó (finding 1.5).

// `share.file` để TÊN TỆP ở `title` — tên tệp không phải chú thích.
const FILE_LIKE_NAME_PATTERN =
    /^\S+\.(?:jpe?g|png|gif|webp|bmp|heic|heif|mp4|mov|3gp|mkv|webm|avi|mp3|m4a|aac|wav|ogg|pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z)$/i;

const URL_ONLY_PATTERN = /^(?:https?:\/\/|www\.)\S+$/i;

/**
 * Chú thích của tin media, lấy THẲNG từ content-object.
 *
 * @param {unknown} content  rawD.content (object, hoặc chuỗi JSON)
 * @param {string} [msgType] rawD.msgType — `share.file` đọc `description`, còn lại `title` trước
 * @returns {string|null}    null khi không có chú thích thật
 */
export function mediaCaptionFromContent(content, msgType = '') {
    let source = content;
    if (typeof source === 'string' && source.trim().startsWith('{')) {
        try {
            source = JSON.parse(source);
        } catch {
            return null;
        }
    }
    if (!source || typeof source !== 'object') {
        return null;
    }
    const raw = String(msgType || '') === 'share.file'
        ? source.description
        : (source.title ?? source.description);
    const caption = String(raw ?? '').trim();
    if (caption === '' || URL_ONLY_PATTERN.test(caption) || FILE_LIKE_NAME_PATTERN.test(caption)) {
        return null;
    }
    return caption;
}

// ── Bank card (zinstant.bankcard) ────────────────────────────────────────────
// Content của tin "thẻ tài khoản" không mang thông tin trực tiếp (title/href
// null) — chi tiết nằm trong template HTML tại params.pcItem.data_url
// (?data=html). Fetch + parse template đó cho ra đủ: tên ngân hàng, BIN,
// số tài khoản, chủ tài khoản, logo, ảnh QR. Nguồn máy-đọc chuẩn nhất là
// VietQR EMV payload nhúng trong link bankcard-action.zalo.me (BIN + số TK);
// text node của template chỉ là fallback.

const BANK_CARD_HTML_MAX_BYTES = 300_000;
const BANK_CARD_FETCH_TIMEOUT_MS = 8_000;
const BANK_CARD_CACHE_MAX = 100;
const bankCardByDataUrl = new Map();

/**
 * `content.params` của Zalo là CHUỖI JSON (bankcard, vị trí…) — nơi duy nhất
 * gỡ chuỗi đó ra object. Đã là object thì trả thẳng.
 *
 * @param {unknown} params
 * @returns {Record<string, unknown> | null}
 */
export function parseContentParams(params) {
    let parsed = params;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return null;
        }
    }
    return parsed && typeof parsed === 'object' ? parsed : null;
}

/**
 * Trích data_url template từ content zinstant.bankcard (sync, không fetch).
 *
 * @param {unknown} content rawD.content
 * @returns {{data_url: string, label: string} | null}
 */
export function parseZinstantBankCardSource(content) {
    if (!content || typeof content !== 'object' || content.action !== 'zinstant.bankcard') {
        return null;
    }
    const params = parseContentParams(content.params);
    if (!params) {
        return null;
    }
    // pcItem (data_type=4) là biến thể HTML; item/bubbleItem cùng URL gốc → thêm ?data=html
    const dataUrl = params.pcItem?.data_url || params.item?.data_url || params.bubbleItem?.data_url;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('https://')) {
        return null;
    }
    const htmlUrl = dataUrl.includes('data=html') ? dataUrl : `${dataUrl}${dataUrl.includes('?') ? '&' : '?'}data=html`;
    return { data_url: htmlUrl, label: contentLabelFromObject(content) };
}

/**
 * Parse VietQR EMVCo payload → BIN + số tài khoản.
 * Tag 38 = Merchant Account Info (NAPAS): sub 01 → {00: BIN, 01: số TK}.
 *
 * @param {string} emv
 * @returns {{bin: string|null, account_number: string|null} | null}
 */
export function parseVietQrEmv(emv) {
    if (typeof emv !== 'string' || emv.length < 8) {
        return null;
    }
    const merchant = parseTlv(emv)['38'];
    if (!merchant) {
        return null;
    }
    const beneficiaryRaw = parseTlv(merchant)['01'];
    if (!beneficiaryRaw) {
        return null;
    }
    const beneficiary = parseTlv(beneficiaryRaw);
    const bin = beneficiary['00'] ?? null;
    const accountNumber = beneficiary['01'] ?? null;
    if (!bin && !accountNumber) {
        return null;
    }
    return { bin, account_number: accountNumber };
}

function parseTlv(payload) {
    const fields = {};
    let i = 0;
    while (i + 4 <= payload.length) {
        const tag = payload.slice(i, i + 2);
        const len = Number(payload.slice(i + 2, i + 4));
        if (!Number.isInteger(len) || len < 0 || i + 4 + len > payload.length) {
            break;
        }
        fields[tag] = payload.slice(i + 4, i + 4 + len);
        i += 4 + len;
    }
    return fields;
}

function decodeHtmlEntities(text) {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
}

/**
 * Parse HTML template bankcard (templateId=11845) → thông tin thẻ.
 * Bám id/class ngữ nghĩa ổn định của template: bank_bin, bank_info,
 * number_text, bank_logo, qr. Ảnh nằm trong CSS `content: url(...)` của
 * class obfuscated đi kèm.
 *
 * @param {string} html
 * @returns {object|null} bank_card fields, null nếu không nhận ra cấu trúc
 */
export function parseBankCardHtml(html) {
    if (typeof html !== 'string' || html === '') {
        return null;
    }
    const textOf = (re) => {
        const m = html.match(re);
        if (!m) {
            return null;
        }
        const cleaned = decodeHtmlEntities(m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
        return cleaned === '' ? null : cleaned;
    };

    const emvMatch = html.match(/bankcard-action\.zalo\.me\?[^"']*?content=([0-9A-Za-z.%*\-_]+)/);
    let emv = null;
    if (emvMatch) {
        try {
            emv = parseVietQrEmv(decodeURIComponent(decodeHtmlEntities(emvMatch[1])));
        } catch {
            emv = null;
        }
    }

    const binText = textOf(/id="bank_bin"[^>]*>([\s\S]*?)<\/p>/);
    const bankName = textOf(/class="bank_info[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    const accountText = textOf(/class="number_text[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    const holder = textOf(/class="number_text[^"]*"[^>]*>[\s\S]*?<p[^>]*class="normal_text[^"]*"[^>]*>([\s\S]*?)<\/p>/);

    const cssImageUrl = (semanticClass) => {
        const imgTag = html.match(new RegExp(`<img[^>]*class="[^"]*\\b${semanticClass}\\b[^"]*"[^>]*>`));
        if (!imgTag) {
            return null;
        }
        const classes = (imgTag[0].match(/class="([^"]+)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);
        for (const cls of classes) {
            const rule = html.match(new RegExp(`\\.${cls}[^{}]*\\{[^}]*content:\\s*url\\((https:[^)]+)\\)`));
            if (rule) {
                return decodeHtmlEntities(rule[1]);
            }
        }
        return null;
    };

    const accountNumber = emv?.account_number ?? (accountText && /^[\d\s]+$/.test(accountText) ? accountText.replace(/\s+/g, '') : null);
    if (!accountNumber && !bankName) {
        return null;
    }
    return {
        bank_name: bankName,
        bank_bin: emv?.bin ?? binText,
        account_number: accountNumber,
        account_holder: holder,
        logo_url: cssImageUrl('bank_logo'),
        qr_url: cssImageUrl('qr'),
    };
}

/**
 * Fetch + parse template bankcard, cache theo data_url (cùng thẻ gửi lại
 * nhiều lần = 1 fetch). Trả null khi fetch/parse fail — caller giữ label.
 *
 * @param {{data_url: string}} source
 * @param {typeof fetch} [fetchImpl] inject cho test
 */
export async function resolveBankCardFromZinstant(source, fetchImpl = fetch) {
    const cached = bankCardByDataUrl.get(source.data_url);
    if (cached) {
        return cached;
    }
    const res = await fetchImpl(source.data_url, { signal: AbortSignal.timeout(BANK_CARD_FETCH_TIMEOUT_MS) });
    if (!res.ok) {
        return null;
    }
    const html = (await res.text()).slice(0, BANK_CARD_HTML_MAX_BYTES);
    const card = parseBankCardHtml(html);
    if (card) {
        if (bankCardByDataUrl.size >= BANK_CARD_CACHE_MAX) {
            bankCardByDataUrl.delete(bankCardByDataUrl.keys().next().value);
        }
        bankCardByDataUrl.set(source.data_url, card);
    }
    return card;
}

/**
 * Chokepoint enrich payload inbound TRƯỚC khi vào outbox — chạy cho MỌI lane
 * (live, relay old_messages, reconnect backfill, deep sync) nên lane sync vẫn
 * ra được bank_card đầy đủ. Payload không có bank_card_source → no-op.
 * Resolve fail → hạ về text + label (fail-open, không chặn ghi tin).
 *
 * @param {object} body payload inbound (mutate tại chỗ)
 * @param {typeof fetch} [fetchImpl] inject cho test
 */
export async function enrichInboundBody(body, fetchImpl = fetch) {
    if (!body || typeof body !== 'object' || !body.bank_card_source) {
        return body;
    }
    const source = body.bank_card_source;
    delete body.bank_card_source;
    try {
        const card = await resolveBankCardFromZinstant(source, fetchImpl);
        if (card) {
            body.inbound_kind = 'bank_card';
            body.bank_card = card;
            return body;
        }
    } catch {
        // fail-open: giữ tin dạng text label bên dưới
    }
    body.inbound_kind = 'text';
    if (!body.content) {
        body.content = source.label;
    }
    return body;
}

/**
 * Dựng địa chỉ ảnh sticker từ mã của nó.
 *
 * Dùng khi không tra được chi tiết qua API — hoặc vì lần tra hỏng, hoặc vì đang
 * ở đường kéo lịch sử, nơi CỐ Ý không gọi API: kéo hàng trăm tin cũ mà mỗi
 * sticker một lời gọi lên API không chính thức là đúng cách để bị khóa tài khoản.
 *
 * Dạng địa chỉ lấy từ chính những lần tra THÀNH CÔNG đã lưu, không phải đoán.
 */
export function stickerUrlFromId(id) {
    const n = Number(id);

    return Number.isFinite(n) && n > 0
        ? `https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=${n}&size=130`
        : null;
}

/** Mã sticker nằm ở một trong bốn tên trường, tùy dạng payload. */
export function stickerIdFrom(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const id = raw.id ?? raw.sticker_id ?? raw.stickerId ?? raw.sid;

    return id == null || id === '' ? null : id;
}

/**
 * Bù địa chỉ ảnh cho một sticker thô, giữ nguyên nếu nó đã có.
 *
 * Không có bước này thì tin sticker kéo về từ lịch sử chỉ còn mã, và giao diện
 * hiện chữ "[Sticker]" thay vì hình.
 */
export function withStickerUrl(raw) {
    if (!raw || typeof raw !== 'object' || raw.url || raw.thumbnail) {
        return raw;
    }

    const url = stickerUrlFromId(stickerIdFrom(raw));

    return url ? { ...raw, url, thumbnail: url } : raw;
}

// ── Vị trí · link · ánh xạ descriptor → payload ─────────────────────────────

export function coerceContentObject(c) {
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

/** Số hữu hạn đầu tiên trong danh sách ứng viên (chuỗi số cũng nhận). */
function firstFiniteNumber(...candidates) {
    for (const candidate of candidates) {
        if (candidate === null || candidate === undefined || candidate === '') {
            continue;
        }
        const n = Number(candidate);
        if (Number.isFinite(n)) {
            return n;
        }
    }
    return NaN;
}

/**
 * Tin vị trí. Hình dạng THẬT đo trên tài khoản founder 07/09/2026 (message 878):
 * `msgType: "chat.location.new"`, `content = {title: null, description: "<địa chỉ>",
 * href: null, params: "{\"isUserLocation\":1,\"srcId\":\"0\",\"latitude\":…,\"longitude\":…}"}`
 * — toạ độ nằm trong CHUỖI JSON `params`, địa chỉ ở `description`.
 *
 * Vẫn đọc cả toạ độ ở tầng ngoài (biến thể `chat.location` cũ) và trả `null` khi
 * không ra số, để tin không dựng được vị trí rơi về nhánh text thay vì mất hẳn.
 */
export function parseInboundLocation(content) {
    const obj = coerceContentObject(content);
    if (!obj || typeof obj !== 'object') {
        return null;
    }
    const params = parseContentParams(obj.params) ?? {};
    const latitude = firstFiniteNumber(params.latitude, params.lat, obj.latitude, obj.lat);
    const longitude = firstFiniteNumber(
        params.longitude,
        params.long,
        params.lng,
        params.lon,
        obj.longitude,
        obj.long,
        obj.lng,
        obj.lon
    );
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }
    const title = String(obj.title ?? obj.name ?? '').trim();
    const address = String(obj.description ?? obj.address ?? obj.desc ?? '').trim();
    const url = String(obj.href ?? obj.url ?? '').trim();
    return {
        latitude,
        longitude,
        ...(title ? { title } : {}),
        ...(address ? { address } : {}),
        url: url || `https://maps.google.com/?q=${latitude},${longitude}`,
    };
}

/** `chat.location` (biến thể cũ) và `chat.location.new` (Zalo hiện tại, zca `utils.js:445`). */
export function isLocationMsgType(msgType) {
    return msgType === 'chat.location' || msgType === 'chat.location.new';
}

/**
 * 1.12: link/webcontent ra contract `fallback` của lõi (external_url +
 * fallback_title) thay cho chuỗi thô `[Link] Tiêu đề https://…`.
 */
export function parseInboundLinkPreview(content, msgType) {
    if (msgType !== 'chat.link' && msgType !== 'chat.webcontent' && msgType !== 'chat.recommended') {
        return null;
    }
    const obj = coerceContentObject(content);
    if (!obj || typeof obj !== 'object') {
        return null;
    }
    const url = String(obj.href ?? obj.url ?? '').trim();
    if (!/^https?:\/\//i.test(url)) {
        return null;
    }
    const title = String(obj.title ?? '').trim();
    const description = String(obj.description ?? obj.desc ?? '').trim();
    const thumb = String(obj.thumb ?? obj.thumbnail ?? '').trim();
    return {
        url,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(thumb ? { thumb } : {}),
    };
}

/**
 * Mention trong tin nhóm. zca `TMention = {uid, pos, len, type}` (`models/Message.d.ts`)
 * — không mang tên, tên chính là đoạn `@…` nằm trong text tại `[pos, pos+len)`.
 * Chuẩn hoá về khoá trung tính để lõi không phải biết cách Zalo đặt tên.
 *
 * @returns {{external_id: string, name: string, offset: number, length: number}[] | null}
 */
export function normalizeMentions(rawD) {
    if (!rawD || typeof rawD !== 'object') {
        return null;
    }
    const content = coerceContentObject(rawD.content);
    const contentMentions =
        content && typeof content === 'object' && Array.isArray(content.mentions) ? content.mentions : null;
    const list = Array.isArray(rawD.mentions) ? rawD.mentions : contentMentions;
    if (!Array.isArray(list) || list.length === 0) {
        return null;
    }
    const text = typeof content === 'string' ? content : String(content?.title ?? content?.description ?? '');
    const normalized = [];
    for (const item of list) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const externalId = String(item.uid ?? item.userId ?? item.external_id ?? '').trim();
        const offset = Number(item.pos ?? item.offset);
        const length = Number(item.len ?? item.length);
        if (!externalId || !Number.isFinite(offset) || !Number.isFinite(length) || length <= 0) {
            continue;
        }
        const slice = text.slice(offset, offset + length).trim();
        normalized.push({
            external_id: externalId,
            name: slice.startsWith('@') ? slice.slice(1).trim() : slice,
            offset,
            length,
        });
    }
    return normalized.length ? normalized : null;
}

/**
 * Chỗ DUY NHẤT gắn ngữ cảnh nhóm vào payload webhook (Q3) — lane live và lane
 * backfill cùng gọi, nên tin nhóm ở hai lane không thể lệch hình dạng nữa.
 * Gắn cho MỌI tin nhóm, kể cả tin do chính tài khoản bridge gửi, vì UI cần biết
 * ai nói câu nào giống hệt app Zalo.
 */
export function applyGroupContextToPayload(
    payload,
    { threadId, groupProfile = null, senderUid = '', senderName = '', senderAvatar = null, mentions = null } = {}
) {
    const id = String(threadId ?? '');
    payload.thread = {
        type: 'group',
        id,
        name: groupProfile?.name ? String(groupProfile.name) : id,
        ...(groupProfile?.avatar ? { avatar: String(groupProfile.avatar) } : {}),
    };
    const uid = String(senderUid ?? '').trim();
    if (uid) {
        payload.sender_uid = uid;
        payload.sender = {
            external_id: uid,
            name: String(senderName ?? '').trim() || uid,
            ...(senderAvatar ? { avatar: String(senderAvatar) } : {}),
        };
    }
    if (mentions && mentions.length) {
        payload.mentions = mentions;
    }
    return payload;
}

/** Chữ khách gõ kèm link (nếu có) — bỏ chuỗi `[Link] Tiêu đề https://…` do bridge tự dựng. */
export function captionBesideLink(plain, linkPreview) {
    const text = String(plain ?? '').trim();
    if (text === '' || text.startsWith('[Link]') || text === linkPreview.url) {
        return null;
    }
    return text;
}

/**
 * Chỗ DUY NHẤT ánh xạ descriptor → payload webhook (1.10). Trước đây lane live và
 * lane backfill mỗi bên giữ một chuỗi if/else riêng, nên loại tin mới chỉ ra được
 * ở một lane — đúng cái bẫy làm `chat.location` biến mất và caption lệch nhau.
 *
 * Sync có chủ đích: lane backfill chạy đồng bộ trong relay-forwarder. Thứ cần gọi
 * API Zalo (sticker, danh thiếp) do lane tự resolve rồi truyền vào.
 */
export function applyInboundDescriptorToPayload(payload, desc, { sticker = null, businessCard = null } = {}) {
    const caption = desc.caption != null ? String(desc.caption) : '';
    switch (desc.inbound_kind) {
        case 'text':
            payload.content = desc.text;
            return payload;
        case 'bank_card':
            payload.bank_card_source = desc.bank_card_source;
            payload.content = desc.bank_card_source.label;
            return payload;
        case 'sticker':
            payload.sticker = sticker;
            return payload;
        case 'business_card':
            payload.business_card = businessCard;
            payload.content = caption;
            return payload;
        case 'call':
            payload.call = desc.call;
            payload.content = '';
            return payload;
        case 'location':
            payload.location = desc.location;
            payload.content = '';
            return payload;
        case 'link':
            payload.link = desc.link;
            payload.content = caption;
            return payload;
        default:
            payload.media_url = desc.media_url;
            if (desc.media_filename) {
                payload.media_filename = desc.media_filename;
            }
            payload.content = caption;
            return payload;
    }
}
