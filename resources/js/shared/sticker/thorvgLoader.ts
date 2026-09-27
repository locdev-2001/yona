// Chỉ nạp khi có sticker động vào khung nhìn: module này (kèm player ThorVG sw-lite)
// nằm ở chunk riêng, còn wasm được Vite tự host. ES module chỉ chạy một lần mỗi trang
// nên custom element `lottie-player` cũng chỉ được khai một lần.
import '@thorvg/lottie-player/sw-lite';
import thorvgWasmUrl from 'thorvg-dist/sw-lite/thorvg.wasm?url';

export interface LottiePlayerElement extends HTMLElement {
    src?: string;
    wasmUrl?: string;
    loop: boolean;
    autoPlay: boolean;
    play(): void;
    pause(): void;
    destroy(): void;
}

// Player gọi `new URL(src)` không kèm base nên đường dẫn tương đối sẽ hỏng im lặng.
const absoluteUrl = (url: string): string => new URL(url, document.baseURI).href;

// Player tự tải wasm lỗi thì không bắn 'error' mà cứ 100 ms đẻ thêm một vòng chờ vô hạn,
// destroy() cũng không dừng được. Nên trang tự tải wasm đúng một lần: lỗi thì ThorVG coi
// như không dùng được cho cả trang, được thì player chỉ đọc lại bản trong bộ nhớ.
let thorvgWasmObjectUrl: Promise<string> | null = null;

async function loadThorvgWasm(): Promise<string> {
    const response = await fetch(absoluteUrl(thorvgWasmUrl));
    if (!response.ok) throw new Error(`thorvg_wasm_http_${response.status}`);

    const bytes = await response.arrayBuffer();
    if (!WebAssembly.validate(bytes)) throw new Error('thorvg_wasm_invalid');

    return URL.createObjectURL(new Blob([bytes], { type: 'application/wasm' }));
}

export async function createLottiePlayer(animationUrl: string): Promise<LottiePlayerElement> {
    thorvgWasmObjectUrl ??= loadThorvgWasm();
    const wasmUrl = await thorvgWasmObjectUrl;

    const player = document.createElement('lottie-player') as LottiePlayerElement;
    player.wasmUrl = wasmUrl;
    player.src = absoluteUrl(animationUrl);
    player.loop = true;
    player.autoPlay = true;
    return player;
}
