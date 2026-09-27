import type { Plugin } from 'vite';

// Player ThorVG tự tải wasm bản đầy đủ từ unpkg khi thiếu `wasmUrl`. Yona luôn tự host
// wasm sw-lite (xem thorvgLoader) nên gỡ hẳn đường dự phòng đó khỏi bundle; nâng phiên
// bản mà chuỗi đổi thì build dừng để người nâng xem lại.
const THORVG_CDN_WASM_FALLBACK = '"https://unpkg.com/@thorvg/lottie-player@1.1.2/dist/thorvg.wasm"';

// pnpm đưa id về đường thật trong .pnpm nên so theo đoạn cuối đường dẫn.
const THORVG_SW_LITE_MODULE = /\/@thorvg\/lottie-player\/dist\/sw-lite\/[^/?]+\.js$/;

export function thorvgWithoutCdnFallback(): Plugin {
    return {
        name: 'yona:thorvg-without-cdn-fallback',
        transform(code, id) {
            if (!THORVG_SW_LITE_MODULE.test(id)) return null;
            if (!code.includes(THORVG_CDN_WASM_FALLBACK)) {
                this.error(`Không thấy đường tải wasm dự phòng của ThorVG trong ${id}: kiểm lại khi nâng @thorvg/lottie-player.`);
            }
            return { code: code.replaceAll(THORVG_CDN_WASM_FALLBACK, '""'), map: null };
        },
    };
}
