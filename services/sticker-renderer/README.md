# sticker-renderer

Dựng sticker từ ảnh người dùng tải lên (PNG, JPG, WebP, GIF; cả GIF/WebP động): cắt, xoá nền không dùng AI, trim, đặt giữa khung vuông chừa lề, co về `size`×`size` (mặc định 64). Mã hoá bằng `sharp`, chạy trong `worker_threads` để cắt cứng khi quá thời gian. Không gọi mạng.

Lõi xoá nền `src/image/background-mask.mjs` là ESM thuần, không phụ thuộc, không dùng API riêng của Node: trình duyệt import cùng tệp này để xem trước, nên xem trước và bản cuối ra cùng một kết quả.

## Cài

```bash
corepack pnpm --dir services/sticker-renderer install --frozen-lockfile --prod
```

Node `^18.17 || ^20.3 || >=21` (theo `sharp` 0.34; Linux x64 dùng bản dựng sẵn).

## Chạy

```bash
node services/sticker-renderer/src/render.mjs <input> <outDir> [--size=64] [--edit=<edit.json>] [--timeout-ms=10000]
```

`edit.json` (khoá nào thiếu thì dùng mặc định):

```json
{
  "crop": {"x": 0.1, "y": 0, "w": 0.8, "h": 1},
  "removeBackground": true,
  "tolerance": 20,
  "feather": 0,
  "strokeWidth": 0.03,
  "edits": [
    {"op": "wand-remove", "x": 0.5, "y": 0.5, "tolerance": 20},
    {"op": "brush-keep", "points": [[0.4, 0.5], [0.6, 0.5]], "radius": 0.03}
  ]
}
```

- `crop`: toạ độ chuẩn hoá 0..1 theo ảnh gốc (đã xoay theo EXIF); `null` = cả ảnh.
- `removeBackground` (mặc định `true`): loang màu 8 hướng từ mép ảnh, hạt giống là điểm mép gần màu nền trội ở mép (histogram viền). Mỗi điểm so với màu hạt giống bằng khoảng cách Lab (CIE76). Mép ảnh đã trong suốt sẵn (≥ 25% điểm mép) thì bỏ lượt tự động.
- `tolerance` 0..100 (mặc định 20): ngưỡng ΔE, 100 = khoảng cách đen–trắng.
- `feather` 0..4 px (mặc định 0 = viền cứng): làm mềm vào phía trong, không lan ra nền.
- `strokeWidth` 0..0.08 (mặc định 0 = tắt): viền trắng theo alpha sau chỉnh ảnh, độ dày tính theo cạnh đầu ra. Thêm lề chung cho mọi khung để viền không bị cắt. Lõi `src/image/white-stroke.mjs` dùng chung với bản xem trước.
- `edits`: áp theo thứ tự sau lượt tự động, toạ độ chuẩn hoá 0..1 theo ảnh **đã cắt**, dùng chung cho mọi khung. `wand-remove`/`wand-keep`: loang từ điểm bấm với dung sai riêng. `brush-remove`/`brush-keep`: nét cọ qua `points`, `radius` chuẩn hoá theo cạnh dài của ảnh đã cắt.

Nền sau khi xoá trong suốt tuyệt đối: điểm viền trộn màu nền được tách lại (ước lượng alpha theo đoạn màu nền → màu vật, khử màu nền khỏi màu điểm) nên không có quầng; điểm alpha 0 có RGB 0 (ở `static.png` và `sticker.webp` tĩnh; bộ mã hoá WebP động không giữ RGB dưới vùng trong suốt).

Thành công: exit 0, stdout một dòng JSON

```json
{"image":"/abs/outDir/sticker.webp","static":"/abs/outDir/static.png","width":64,"height":64,"frames":1,"durationMs":0,"warnings":[]}
```

- `sticker.webp`: tĩnh (lossless) hoặc động (lossy, `loop: 0`, giữ độ trễ từng khung; độ trễ < 20ms tính là 100ms như trình duyệt).
- `static.png`: khung đầu, PNG bảng màu, cho kênh ngoài.
- `warnings`: `mask_empty` (xoá hết, ảnh ra trong suốt), `mask_full` (lượt tự động không xoá được điểm nào).

Lỗi: exit 1, stdout `{"error":"<code>"}`, chi tiết ở stderr, không ghi tệp ra `outDir`.

| code | Nghĩa |
|---|---|
| `usage` | Sai tham số, hoặc `edit.json` không đọc được / sai giá trị |
| `input_unreadable` | Không đọc hoặc không giải mã được ảnh |
| `unsupported_format` | Không phải PNG/JPG/WebP/GIF |
| `input_too_large` | Tệp > 20 MB, khung > 25 megapixel, hoặc ảnh động dài > 10 giây |
| `too_many_frames` | Ảnh động > 200 khung |
| `render_failed` | Lỗi khi xử lý |
| `timeout` | Quá `--timeout-ms` (mặc định 10000, tối đa 60000), worker bị dừng cứng |
| `output_failed` | Không ghi được tệp ra |

## Test

```bash
corepack pnpm --dir services/sticker-renderer test
```

Test tự dựng ảnh bằng `sharp`, không dùng fixture ngoài.
