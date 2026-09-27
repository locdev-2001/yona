import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Custom element thật không cần cho các ca này; nạp lại module nhiều lần sẽ khai trùng.
vi.mock('@thorvg/lottie-player/sw-lite', () => ({}));

const WASM_OBJECT_URL = 'blob:http://localhost/thorvg-wasm';
// Module wasm rỗng hợp lệ: magic `\0asm` + version 1.
const VALID_WASM_BYTES = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

function wasmResponse(bytes: Uint8Array, status = 200) {
    return { ok: status >= 200 && status < 300, status, arrayBuffer: async () => bytes.slice().buffer };
}

async function freshLoader() {
    vi.resetModules();
    return import('./thorvgLoader');
}

describe('thorvgLoader', () => {
    let fetchWasm: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchWasm = vi.fn();
        vi.stubGlobal('fetch', fetchWasm);
        vi.spyOn(URL, 'createObjectURL').mockReturnValue(WASM_OBJECT_URL);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('tải wasm đúng một lần mỗi trang và đưa player bản trong bộ nhớ', async () => {
        fetchWasm.mockResolvedValue(wasmResponse(VALID_WASM_BYTES));
        const { createLottiePlayer } = await freshLoader();

        const first = await createLottiePlayer('/stickers/ab/anim.json');
        const second = await createLottiePlayer('/stickers/cd/anim.json');

        expect(fetchWasm).toHaveBeenCalledTimes(1);
        expect(fetchWasm.mock.calls[0][0]).toMatch(/^http:\/\/localhost\/.*thorvg.*\.wasm$/);
        expect(first.wasmUrl).toBe(WASM_OBJECT_URL);
        expect(second.wasmUrl).toBe(WASM_OBJECT_URL);
        expect(first.src).toBe('http://localhost/stickers/ab/anim.json');
        expect(first.loop).toBe(true);
        expect(first.autoPlay).toBe(true);
    });

    it('mạng lỗi khi tải wasm thì không tạo player nào nữa trên trang', async () => {
        fetchWasm.mockRejectedValue(new TypeError('Failed to fetch'));
        const { createLottiePlayer } = await freshLoader();
        const createElement = vi.spyOn(document, 'createElement');

        await expect(createLottiePlayer('/a.json')).rejects.toThrow();
        await expect(createLottiePlayer('/b.json')).rejects.toThrow();

        expect(fetchWasm).toHaveBeenCalledTimes(1);
        expect(createElement).not.toHaveBeenCalledWith('lottie-player');
    });

    it('máy chủ trả lỗi HTTP thì coi như ThorVG không dùng được', async () => {
        fetchWasm.mockResolvedValue(wasmResponse(new Uint8Array(), 404));
        const { createLottiePlayer } = await freshLoader();

        await expect(createLottiePlayer('/a.json')).rejects.toThrow();
    });

    it('nội dung không phải wasm (trang HTML trả 200) thì không giao cho player', async () => {
        fetchWasm.mockResolvedValue(wasmResponse(new TextEncoder().encode('<!doctype html>')));
        const { createLottiePlayer } = await freshLoader();

        await expect(createLottiePlayer('/a.json')).rejects.toThrow();
        expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
});
