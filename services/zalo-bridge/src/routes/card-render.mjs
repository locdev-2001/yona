import { renderCardPng } from '../card-render/render.mjs';

const SUPPORTED_KINDS = ['cards', 'order_status', 'webview', 'article'];

/**
 * `POST /render/card` — ảnh thẻ cho kênh không có dạng gốc (phase-06 §6b), cùng
 * secret gửi tin với `/personal-messages/send`. Không đụng slot Zalo (không cần
 * `connection_id`) nên tách route riêng khỏi `registerPersonalMessageRoutes`.
 */
export function registerCardRenderRoutes(app, { checkSendSecret }) {
    app.post('/render/card', async (req, res) => {
        if (!checkSendSecret(req, res)) {
            return;
        }

        const { kind, attributes, theme } = req.body || {};

        if (!SUPPORTED_KINDS.includes(kind) || typeof attributes !== 'object' || attributes === null) {
            return res.status(400).json({ ok: false, message: 'invalid_kind_or_attributes' });
        }

        try {
            const png = await renderCardPng({ kind, attributes, theme });

            return res.status(200).type('image/png').send(png);
        } catch (e) {
            console.error('renderCard', e);

            return res.status(500).json({ ok: false, message: e?.message || String(e) });
        }
    });
}
