import { CARD_FONT_FAMILY } from './fonts.mjs';
import { formatMoney } from './money.mjs';

// Vẽ lại 4 loại tin có cấu trúc chưa có renderer gốc (cards, order_status, webview,
// article) bằng cây phần tử satori — KHÔNG dùng JSX vì bridge chạy thẳng bằng `node`,
// không qua bước biên dịch. `h()` là pragma tối giản, tương đương React.createElement,
// đủ cho satori (satori chỉ cần {type, props: {style, children}}).
//
// Bám khung `resources/js/shared/messaging/kit/kit.css` + các `types/*.tsx` nhưng KHÔNG
// vẽ nút hành động: kênh nhận ảnh này luôn có chữ đi kèm (DeliveryPlan::imageText),
// nút/lựa chọn đã nằm trong danh sách đánh số của phần chữ — vẽ lại trên ảnh là trùng.

export const CARD_WIDTH = 600;
export const MAX_RENDERED_ITEMS = 3;

function h(type, props = {}, ...children) {
    return { type, props: { ...props, children: children.flat(Infinity).filter((child) => child !== null && child !== undefined && child !== false) } };
}

function root(theme, ...children) {
    return h('div', {
        style: {
            display: 'flex',
            flexDirection: 'column',
            width: CARD_WIDTH,
            backgroundColor: theme.surface,
            fontFamily: CARD_FONT_FAMILY,
            color: theme.ink,
        },
    }, ...children);
}

function divider(theme) {
    return h('div', { style: { display: 'flex', height: 1, backgroundColor: theme.line, margin: '0 28px' } });
}

function moreLine(theme, text) {
    return h('div', { style: { display: 'flex', padding: '18px 28px 26px', fontSize: 17, color: theme.ink2 } }, text);
}

/** @param {list<{type}>|undefined} rows */
function stackWithDividers(theme, rows) {
    return rows.flatMap((row, index) => (index === 0 ? [row] : [divider(theme), row]));
}

// ── cards ────────────────────────────────────────────────────────────────

function priceBlock(theme, price) {
    if (!price) {
        return null;
    }

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        h('span', { style: { fontSize: 26, fontWeight: 700 } }, formatMoney(price.amount, price.currency)),
        price.compare_at
            ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { display: 'flex', fontSize: 18, color: theme.ink3, textDecoration: 'line-through' } }, formatMoney(price.compare_at, price.currency)),
                h('span', { style: { display: 'flex', fontSize: 15, fontWeight: 600, color: theme.sale, backgroundColor: theme.saleBg, padding: '2px 8px', borderRadius: 6 } }, `-${price.discount_percent}%`))
            : null);
}

/** "Còn 2 cái", hoặc tóm biến thể, hoặc mô tả — giữ đúng thứ tự ưu tiên của `cards.tsx`. */
function cardSubline(item) {
    if (item.stock_label) {
        return item.stock_label;
    }

    if (item.variants?.length) {
        return item.variants.map((variant) => `${variant.options.length} ${variant.name.toLowerCase()}`).join(' · ');
    }

    return item.description ?? null;
}

function cardRow(theme, item, imageDataUri) {
    const subline = cardSubline(item);

    return h('div', { style: { display: 'flex', flexDirection: 'row', gap: 20, padding: '24px 28px', alignItems: 'flex-start' } },
        imageDataUri
            ? h('img', { src: imageDataUri, width: 140, height: 140, style: { display: 'flex', borderRadius: 20, objectFit: 'cover', backgroundColor: theme.media } })
            : null,
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 } },
            h('span', { style: { fontSize: 24, fontWeight: 600, lineHeight: 1.3 } }, item.title),
            priceBlock(theme, item.price),
            subline ? h('span', { style: { fontSize: 18, color: theme.ink2 } }, subline) : null));
}

/**
 * `items` đã chuẩn hoá (`CardsType::normalize`). Vẽ tối đa `MAX_RENDERED_ITEMS`
 * thẻ xếp DỌC trong một ảnh — nhiều thẻ hơn thì ghi "+N sản phẩm khác" thay vì
 * vẽ hết (khách nhận n ảnh riêng rẽ trên Zalo khó lướt hơn cuộn dọc một ảnh).
 *
 * @param {list<string|null>} images  data URI theo đúng thứ tự `items` đã cắt
 */
export function renderCardsTree(attributes, theme, images) {
    const items = attributes.items.slice(0, MAX_RENDERED_ITEMS);
    const remaining = attributes.items.length - items.length;
    const rows = stackWithDividers(theme, items.map((item, index) => cardRow(theme, item, images[index] ?? null)));

    if (remaining > 0) {
        rows.push(divider(theme), moreLine(theme, `+${remaining} sản phẩm khác`));
    }

    return root(theme, ...rows);
}

// ── order_status ─────────────────────────────────────────────────────────

const ORDER_STEPS = ['placed', 'shipped', 'delivering', 'delivered'];
const ORDER_STEP_OF = { placed: 0, confirmed: 0, shipped: 1, delivering: 2, delivered: 3, cancelled: -1 };
const ORDER_STATUS_LABELS = {
    placed: 'Đã đặt',
    confirmed: 'Đã xác nhận',
    shipped: 'Đã gửi hàng',
    delivering: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã huỷ',
};
const ORDER_STEP_LABELS = { placed: 'Đặt hàng', shipped: 'Gửi hàng', delivering: 'Đang giao', delivered: 'Đã giao' };

/** "2026-09-30" → "30/09", cùng cách `order-status.tsx` cắt chuỗi ISO. */
function formatEta(eta) {
    const [, month, day] = eta.split('-');

    return `${day}/${month}`;
}

export function renderOrderStatusTree(attributes, theme) {
    const current = ORDER_STEP_OF[attributes.status] ?? -1;

    const header = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, padding: 28, backgroundColor: theme.solid, color: theme.onSolid } },
        h('span', { style: { display: 'flex', fontSize: 18, color: theme.onSolidSoft } }, `Đơn ${attributes.order_ref}`),
        h('span', { style: { display: 'flex', fontSize: 30, fontWeight: 700 } }, ORDER_STATUS_LABELS[attributes.status] ?? attributes.status),
        attributes.eta ? h('span', { style: { display: 'flex', fontSize: 18, color: theme.onSolidSoft } }, `Dự kiến ${formatEta(attributes.eta)}`) : null);

    const steps = current >= 0
        ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            h('div', { style: { display: 'flex', gap: 6 } }, ...ORDER_STEPS.map((step, index) => h('div', {
                style: {
                    display: 'flex',
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: index < current || attributes.status === 'delivered' ? theme.good : index === current ? theme.accent : theme.track,
                },
            }))),
            h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, ...ORDER_STEPS.map((step, index) => h('span', {
                style: { display: 'flex', fontSize: 14, fontWeight: index === current ? 600 : 400, color: index === current ? theme.ink : theme.ink2 },
            }, ORDER_STEP_LABELS[step]))))
        : null;

    const total = attributes.total
        ? h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
            h('span', { style: { display: 'flex', fontSize: 17, color: theme.ink2 } }, attributes.fee_included ? 'Tổng (đã gồm ship)' : 'Tạm tính'),
            h('span', { style: { display: 'flex', fontSize: 24, fontWeight: 700 } }, formatMoney(attributes.total.amount, attributes.total.currency)))
        : null;

    return root(theme, header, h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20, padding: 28 } }, steps, total));
}

// ── webview ──────────────────────────────────────────────────────────────

const WEBVIEW_PAGE_LABELS = {
    schedule: 'Đặt lịch',
    form: 'Điền form',
    order_tracking: 'Tra cứu đơn',
    product: 'Xem sản phẩm',
    bank_transfer: 'Chuyển khoản',
};

// Icon glyph SVG cần dữ liệu path riêng cho satori — tối giản bằng ô chữ cái đầu
// thay vì chép icon `kit/icons.tsx`; đổi sau nếu founder thấy cần giống hơn.
export function renderWebviewTree(attributes, theme) {
    const label = WEBVIEW_PAGE_LABELS[attributes.page] ?? attributes.page;

    return root(theme,
        h('div', { style: { display: 'flex', flexDirection: 'row', gap: 20, padding: '32px 28px', alignItems: 'center' } },
            h('div', {
                style: {
                    display: 'flex',
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    backgroundColor: theme.accent,
                    color: theme.onAccent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 700,
                },
            }, label.slice(0, 1).toUpperCase()),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 } },
                h('span', { style: { display: 'flex', fontSize: 24, fontWeight: 600 } }, attributes.title),
                attributes.subtitle ? h('span', { style: { display: 'flex', fontSize: 18, color: theme.ink2 } }, attributes.subtitle) : null)));
}

// ── article ──────────────────────────────────────────────────────────────

function articleRow(theme, item) {
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, padding: '22px 28px' } },
        h('span', { style: { display: 'flex', fontSize: 22, fontWeight: 600 } }, item.title),
        item.description ? h('span', { style: { display: 'flex', fontSize: 17, color: theme.ink2 } }, item.description) : null);
}

export function renderArticleTree(attributes, theme) {
    const items = attributes.items.slice(0, MAX_RENDERED_ITEMS);
    const remaining = attributes.items.length - items.length;
    const rows = stackWithDividers(theme, items.map((item) => articleRow(theme, item)));

    if (remaining > 0) {
        rows.push(divider(theme), moreLine(theme, `+${remaining} bài khác`));
    }

    return root(theme, ...rows);
}
