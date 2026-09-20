# Trang chủ — đặc tả

## Dấu cấu trúc

**Bốn hình vuông ĐẶC `8×8px` ở bốn góc mỗi section, thụt `16px` khỏi mép MÀN HÌNH**
(không phải mép container). Không đường kẻ dọc. Không hairline ngang. Không dấu cộng.

*(đo 19/09 · 1440px)* — quét từng phần tử của bề mặt tham chiếu: không có phần tử
nào rộng ≤2px cao >150px, cũng không có phần tử nào cao ≤2px rộng >300px. Nghĩa là
không có kẻ dọc và không có hairline ngang nào cả.

Bản chuẩn trước quy định hai đường kẻ dọc `1px` ở mép container cộng dấu cộng bốn
góc. Kẻ dọc chạy suốt thì **vẽ ra cái khung**; bốn dấu vuông thì **chỉ đánh dấu
bốn góc** — cùng tác dụng chống trôi nổi, nhẹ hơn một bậc, không cạnh tranh với chữ.

| Chỗ | Cỡ | Thụt | Màu |
|---|---|---|---|
| bốn góc section | `8×8` | 16px khỏi mép màn hình | accent của section |
| bốn góc trong thẻ / giếng ảnh | `8×8` | 16px vào trong hộp | `neutral-300` |
| đầu mỗi nhãn eyebrow | `8×8` | — | accent của section |
| bốn góc thẻ giá | `4×4` | 0 | `neutral-900` |

Chỉ hiện từ `md`. Dưới 768px container chạm mép nên dấu góc chồng lên nội dung.

**Thanh accent `2px`** đánh dấu từng ô trong một hàng, thay cho `border-t` chạy
suốt. Dài `w-1/5` bề ngang ô — *(ta chọn)*, không phải số đo. Kẻ suốt hàng nối các
ô thành một dải liền; đoạn ngắn thì mỗi ô được đọc riêng.

```tsx
<Section surface="band" accent="primary">…</Section>
// Section tự vẽ dấu góc; không tự đặt tay.
```

## Mười section, thứ tự cố định

Nav cố định cao 64px, `bg-neutral-0` đặc, **không viền dưới, không bóng, không blur**.

| # | Section | Bề mặt | Nhịp | Nội dung |
|---|---|---|---|---|
| 1 | Hero | `base` | `md` + **`fill`** | `text-display` 3 dòng căn giữa · đoạn dẫn · 2 nút · dòng gỡ rào 14px · nét mực hai lề. **Cao đúng một màn hình** |
| 2 | Ảnh sản phẩm | `band` | `md` | nhãn `text-h2` nửa mờ nửa đậm · 2 tab chia đôi bề rộng, nhãn `text-h3` · ảnh rộng đúng container, **không viền** |
| 3 | Dải kênh | `base` | `sm` | eyebrow **căn trái mép container** · lưới 4 cột × 3 hàng, icon **đơn sắc** · ghi chú |
| 4 | Tính năng A | `band` | `lg` | bộ khung đầy đủ, media rộng |
| 5 | Tính năng B | `base` | `lg` | khung chữ như A, media **chia đôi** |
| 6 | Tính năng C | `band` | `lg` | khung chữ như A, media **ba giếng vuông** |
| 7 | Bốn bước | `base` | `md` | eyebrow · h1 · 4 cột, số thứ tự `font-mono` màu mực, thanh accent ở đỉnh từng ô. **Cố tình không ảnh** — nằm giữa hai section có hình nên đây là quãng nghỉ |
| 8 | Nguyên tắc | `band` | `lg` | lưới 4 cột, mỗi ô một tranh **tỉ lệ 4/3** trên tiêu đề |
| 9 | Bảng giá | `band` **tràn mép** | `md` | h1 căn giữa · thẻ `max-w-price` nền `neutral-100` pad 64, dấu góc `4×4` mực, **giá `text-h1` 54px** · 2 nút · chữ nhỏ trong **khối riêng xếp liền dưới thẻ** |
| 10 | Kết trang | `base` | `xl` 216px | `text-display` căn giữa · 2 nút · nét mực rải khắp bề ngang, cả trên lẫn dưới |

**Hai nút ở mọi section có CTA, kể cả hero.** Nút lẻ trôi giữa khoảng trắng là dấu
hiệu rõ nhất của trang dựng máy.

## Khối tính năng — khung chữ cố định, media ĐỔI DẠNG

Phần chữ lặp nguyên văn ở cả ba khối:

```
nhãn eyebrow (vuông 8x8 + chữ mono)
  (nét mực ở nửa phải, cùng hàng với tiêu đề)
tiêu đề hai dòng      <- text-h1, ngắt dòng bằng <br> có chủ đích
đoạn dẫn              <- text-base font-light, max-w-reading
hai nút               <- CtaPair: primary + secondary viền mực
```

Media thì **mỗi khối một dạng**:

| Khối | Media | Sau media |
|---|---|---|
| A | ảnh rộng trong khung viền `1px` | lưới 3 cột **không khoảng hở**, mỗi ô có thanh accent + vuông `8×8`, ô đầu nền `neutral-900/5` |
| B | **chia đôi 3/5 · 2/5 không khoảng hở**: ảnh panel trái, mục mở/đóng bên phải; mỗi mục có thanh accent + vuông `8×8`, mục đang mở nền `neutral-900/5` | — |
| C | **ba giếng vuông** nền `neutral-100`, ảnh `cover`, 4 dấu góc mỗi giếng | lưới 3 cột, h3 lên `text-h2` |

Lặp một dạng media cho cả ba khối là lỗi: khối thứ hai sẽ đọc y hệt khối thứ nhất.

Link "Tìm hiểu thêm" **không có mũi tên** — ba mũi tên cạnh nhau đọc thành hoa văn
chứ không thành ba hành động.

## Khung ảnh sản phẩm

**Viền `1px neutral-300`, VUÔNG GÓC, KHÔNG padding, KHÔNG bóng — ảnh tràn sát viền.**

| Dạng | Viền | Nền lộ | Dấu góc trong |
|---|---|---|---|
| ảnh rộng (khối tính năng) | `1px neutral-300` | không | không |
| ảnh tab (section 2) | **không viền** | không | không |
| giếng vuông (khối C) | không viền | `neutral-100` | 4 × `8×8 neutral-300` |
| panel trái (khối B) | `1px neutral-300` | `neutral-100` | không |

Ảnh chụp bắt buộc:

- **Giao diện thật, dữ liệu thật, đúng ngôn ngữ trang đang render.** Ảnh tiếng Anh
  trên trang tiếng Việt là lỗi nội dung.
- Mỗi khối một ảnh **khác nhau**.
- Mặc định `h-auto w-full` kèm `width`/`height` gốc. **Không** `object-cover` —
  ảnh đã cắt sẵn, cover phóng to rồi cắt tiếp và thường rơi vào một góc trắng.
  Ngoại lệ duy nhất: ảnh **vuông** trong giếng vuông, nơi tỉ lệ đã trùng.
- **Kiểm nhát cắt.** `check-ui.py` C2 bắt ảnh bị cắt xuyên chữ. Lỗi đã xảy ra:
  hai ảnh vuông mất chữ cái đầu của mọi tên khách.
- Cấm khung giữ chỗ nét đứt và "ảnh sản phẩm" dựng bằng `<div>` trong bản ship.

## Tranh trang trí

| Ràng buộc | Luật |
|---|---|
| Nguồn | **chỉ tác phẩm phạm vi công cộng / CC0** kiểm chứng được |
| Xuất xứ | mỗi ảnh ghi tác phẩm, tác giả, niên đại, bộ sưu tập, giấy phép vào `public/landing/art/CREDITS.json` — `check-ui.py` C7 gác |
| Chất ảnh | **CHỈ nét mực nền trong suốt.** Khối màu đặc bị cấm. Kiểm: alpha trong suốt > 25% và điểm có màu < 5% |
| Đa dạng | đa dạng **chủ đề**, đồng nhất **chất liệu**. Trộn chất liệu làm hero và kết trang trông như tường tranh |
| Cắt | giữ tỉ lệ gốc. Chỉ giới hạn cạnh dài |
| Bề rộng | khai bằng class co theo breakpoint (`w-36 2xl:w-48`), **không** ép `style` cứng. Cỡ cố định là lý do phải đẩy tranh ra ngoài mép, làm tấm nào cũng bị cắt đôi |
| **Không đè chữ** | nằm **trên** dải chữ, **dưới** dải chữ, hoặc **ngoài bề ngang** dải chữ. Không ngoại lệ |
| Lớp chứa | đi qua prop `art` của `Section` — lớp này phủ **toàn bộ chiều cao section**. Đặt tranh làm con của div nội dung là sai: div đó chỉ cao bằng dòng chữ |
| Ngưỡng hiện | **`xl` (1280px)**. Dưới ngưỡng phải ẩn hẳn |
| Bố cục | phần lớn hiện **trọn vẹn**; chỉ một hai tấm bị mép cắt, và cắt chừng một phần ba. Năm tấm cùng bị cắt đôi đọc ra là mảnh vụn dán vào cạnh màn hình |
| Ngữ nghĩa | `aria-hidden`, `alt=""`, `pointer-events-none select-none`, `loading="lazy"` |
| Tràn mép | được phép tràn khỏi container; section phải có `overflow-x-clip` |

Ở section cao bằng màn hình thì đặt tranh **ra lề hai bên**: vị trí dọc của chữ đổi
theo chiều cao màn hình nên `top` cố định sẽ đè ở một cỡ nào đó.

Chủ đề không hợp trang bán hàng: chân dung nhìn thẳng, tượng tôn giáo, khoả thân,
thú bị thương. Trang trí phải lùi lại, không kể chuyện riêng của nó.

Tái lập bộ tranh: `python3 scripts/make-landing-art.py --build`.

## Footer

`bg-neutral-0`, **có** `border-t neutral-300`. Tiêu đề cột `text-eyebrow` mono.
Link `text-sm` weight thường, có gạch chân mảnh. Hàng cuối riêng (bản quyền + một
dòng định vị) tách bằng `border-t`. **Chỉ liệt kê đích thật sự tồn tại.**
