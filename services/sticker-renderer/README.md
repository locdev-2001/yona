# sticker-renderer

Render một sticker Lottie (`.json`) hoặc TGS (Lottie nén gzip) ra hai ảnh nền trong suốt:

- `poster.webp` 256×256
- `static.png` 512×512

Engine là ThorVG wasm bản **sw-lite** (không expressions, không font), lấy từ gói `@thorvg/lottie-player` đã pin cứng phiên bản, chạy trong `worker_threads` để có thể cắt cứng khi quá thời gian. Mã hoá ảnh bằng `sharp`. Không gọi mạng.

## Cài

```bash
corepack pnpm --dir services/sticker-renderer install --frozen-lockfile --prod
```

Cần Node ≥ 18.17 (Linux x64 dùng bản `sharp` dựng sẵn, không cần build).

## Chạy

```bash
node services/sticker-renderer/src/render.mjs <input.json|input.tgs> <outDir> [--timeout-ms=5000]
```

Thành công: exit 0, stdout một dòng JSON

```json
{"poster":"/abs/outDir/poster.webp","static":"/abs/outDir/static.png","frame":45,"width":512,"height":512,"frames":60,"duration":2,"warnings":[]}
```

- `frame`: số khung Lottie (cùng hệ với `ip`/`op`) dùng cho ảnh tĩnh. Lấy theo marker tên `poster`; không có marker thì lấy khung giữa `floor((ip+op)/2)` và thêm cảnh báo `poster_marker_missing` (marker nằm ngoài `[ip, op)` thì cảnh báo `poster_marker_out_of_range`).
- `width`/`height`: kích thước gốc của Lottie. Ảnh ra luôn vuông, hình được co vừa và căn giữa.
- `frames`/`duration`: tổng số khung và thời lượng (giây) theo ThorVG.

Lỗi: exit 1, stdout `{"error":"<code>"}`, chi tiết ở stderr, không ghi tệp nào ra `outDir`.

| code | Nghĩa |
|---|---|
| `usage` | Sai tham số |
| `input_unreadable` | Không đọc được tệp đầu vào |
| `input_too_large` | Tệp > 2 MiB hoặc giải nén > 4 MiB |
| `invalid_gzip` | Có header gzip nhưng giải nén hỏng |
| `invalid_json` | Không phải JSON |
| `invalid_lottie` | JSON thiếu `w`/`h`/`fr`/`ip`/`op`/`layers` hợp lệ |
| `load_failed` | ThorVG từ chối nạp |
| `render_failed` | ThorVG hoặc worker lỗi khi vẽ |
| `timeout` | Quá `--timeout-ms` (mặc định 5000ms), worker bị dừng cứng |
| `engine_unavailable` | Không nạp được ThorVG (thiếu gói hoặc đổi phiên bản gói) |
| `output_failed` | Không ghi được tệp ra |

## Test

```bash
corepack pnpm --dir services/sticker-renderer test
```

Fixture ở `tests/Fixtures/stickers/`.

## Nâng phiên bản `@thorvg/lottie-player`

Gói không xuất module Emscripten riêng; `src/thorvg-engine.mjs` tách hàm khởi tạo từ bundle `dist/sw-lite/lottie-player.esm.js` theo hai mốc chuỗi cố định. Vì vậy phiên bản được pin chính xác. Khi nâng: đổi phiên bản, chạy test; nếu ra `engine_unavailable` thì cập nhật hai mốc `FACTORY_START`/`FACTORY_END`.
