import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadCardFonts } from './fonts.mjs';
import { resolveTheme } from './theme.mjs';
import { fetchImageDataUri } from './media.mjs';
import { CARD_WIDTH, MAX_RENDERED_ITEMS, renderArticleTree, renderCardsTree, renderOrderStatusTree, renderWebviewTree } from './templates.mjs';

// Mật độ ảnh gửi ra Zalo: vẽ ở CARD_WIDTH rồi rasterize gấp đôi — nét trên màn
// hình mật độ điểm cao mà không phải tính lại layout satori ở kích thước lớn.
const RENDER_SCALE = 2;

const SUPPORTED_KINDS = ['cards', 'order_status', 'webview', 'article'];

/**
 * Vẽ ảnh thẻ cho một loại tin có cấu trúc chưa có renderer gốc trên kênh đích
 * (`App\Messaging\Delivery\CardImageService` là nơi DUY NHẤT gọi hàm này qua
 * `POST /render/card`).
 *
 * @param {{kind: string, attributes: Record<string, any>, theme?: {accent?: string}}} input
 * @returns {Promise<Buffer>} PNG
 */
export async function renderCardPng({ kind, attributes, theme }) {
    if (!SUPPORTED_KINDS.includes(kind)) {
        throw new Error(`unsupported_kind:${kind}`);
    }

    const resolvedTheme = resolveTheme(theme);
    const [tree, fonts] = await Promise.all([buildTree(kind, attributes, resolvedTheme), loadCardFonts()]);
    const svg = await satori(tree, { width: CARD_WIDTH, fonts });
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: CARD_WIDTH * RENDER_SCALE } });

    return resvg.render().asPng();
}

async function buildTree(kind, attributes, theme) {
    switch (kind) {
        case 'cards': {
            const items = attributes.items.slice(0, MAX_RENDERED_ITEMS);
            const images = await Promise.all(items.map((item) => (item.media_url ? fetchImageDataUri(item.media_url) : null)));

            return renderCardsTree(attributes, theme, images);
        }
        case 'order_status':
            return renderOrderStatusTree(attributes, theme);
        case 'webview':
            return renderWebviewTree(attributes, theme);
        case 'article':
            return renderArticleTree(attributes, theme);
        default:
            // Đã chặn ở SUPPORTED_KINDS phía trên — chỉ còn lại để TypeScript/đọc code an tâm.
            throw new Error(`unsupported_kind:${kind}`);
    }
}
