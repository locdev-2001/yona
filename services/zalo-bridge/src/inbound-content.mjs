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
 * Trích data_url template từ content zinstant.bankcard (sync, không fetch).
 *
 * @param {unknown} content rawD.content
 * @returns {{data_url: string, label: string} | null}
 */
export function parseZinstantBankCardSource(content) {
    if (!content || typeof content !== 'object' || content.action !== 'zinstant.bankcard') {
        return null;
    }
    let params = content.params;
    if (typeof params === 'string') {
        try {
            params = JSON.parse(params);
        } catch {
            return null;
        }
    }
    if (!params || typeof params !== 'object') {
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
