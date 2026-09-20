# Bảng tra — token, chữ, khoảng cách, chuyển động, icon

Nguồn sự thật là `tailwind.landing.config.js` và `resources/css/landing.css`.
Tệp này là bản tra; lệch nhau thì **config đúng, tệp này sai**.

Doc cũ từng ghi h2 = 28px trong khi config để 24px — không ai diff hai bên. Khi
sửa config phải sửa tệp này cùng lúc.

## Thang chữ

Khớp chính xác `fontSize` trong config.

| Class | Cỡ | lh | ls |
|---|---|---|---|
| `text-display` | clamp 32→80px | 1.05 | −0.03em |
| `text-h1` | clamp 28→54px | 1.05 | −0.03em |
| `text-h2` | 24px | 1.05 | −0.02em |
| `text-h3` | 20px | 1.2 | −0.01em |
| `text-h4` | 16px | 1.4 | −0.01em |
| `text-lead` | 18px | 1.45 | −0.01em |
| `text-base` | 16px | 1.5 | 0 |
| `text-sm` | 14px | 1.5 | 0 |
| `text-eyebrow` | 12px | 1.2 | +0.05em |
| `text-caption` | 12px | 1.4 | 0 |

**Không có bậc 32px.** Bậc đó từng tồn tại, nằm giữa 24 và 54 mà không mang vai
nào riêng. Tiêu đề khối nhỏ và caption dưới ảnh đều dùng `text-h2`.

Weight: chỉ `font-light` 300 · `font-normal` 400 · `font-medium` 500.

`text-eyebrow` có `lh 1.2` chứ không phải 1.0 — nhãn là chữ HOA tiếng Việt, dấu
chồng hai tầng (`Ộ Ữ Ế`) bị cắt dưới 1.05. *(ta chọn, vì lý do ngôn ngữ)*

## Font

| Họ | Class | Dùng cho |
|---|---|---|
| Be Vietnam Pro | `font-sans` | mọi chữ |
| Be Vietnam Pro Tnum | `font-num` | cột số — bản thường có chữ số lệch bề rộng |
| JetBrains Mono | `font-mono` | **chỉ** nhãn eyebrow |

## Màu

Khai bằng bộ ba kênh RGB trong `landing.css` để modifier opacity hoạt động
(`bg-primary-600/10` cần dạng này mới sinh ra `rgb(... / 0.1)`).

### Ba bậc bề mặt

| Bậc | Token | Mã | Dùng |
|---|---|---|---|
| Gốc | `neutral-0` | `#FFFFFF` | thân trang, nav, footer |
| Dải | `neutral-50` | `#FAF9F6` | section xen kẽ |
| Giếng | `neutral-100` | `#F1EEE9` | nền lộ ra khi ảnh không phủ kín hộp, panel nhấn |

Cả hai bậc đầu đều ngả vàng nhẹ. **Không có bậc xám lạnh nào trên bề mặt công khai.**

### Khác

| Token | Ghi chú |
|---|---|
| `neutral-300` `#DEDBD6` | viền hairline |
| `neutral-400` | chỉ cho đồ hoạ, **không mang chữ** |
| `neutral-500` | 4.57:1 trên linen — mang chữ được |
| `neutral-900` `#111111` | chữ tiêu đề |
| `primary-600` `#0068D6` | nền nút chính |
| `navy` `#011740` | accent mạch hồ sơ/dữ liệu |
| `cyan` `#00BAFD` | **chỉ trên nền navy**, không mang chữ |

### Accent theo mạch sản phẩm

Section nói về mạch nào thì dấu góc, dấu eyebrow và thanh accent trong section đó
dùng một màu.

| Accent | Class | Mạch |
|---|---|---|
| `primary` | `bg-primary-600` | hội thoại — hộp thư, Zalo, kênh, vòng đời |
| `navy` | `bg-navy` | hồ sơ / dữ liệu — CRM, pipeline, nguyên tắc |
| `neutral` | `bg-neutral-300` | trung tính — ảnh sản phẩm, kết trang |

## Khoảng cách

| Hạng mục | Giá trị |
|---|---|
| Thang gap | 4 · 8 · 12 · 16 · 24 · 32 |
| Gutter ngang | `px-4` mobile · `px-10` từ 768px |
| Container | **1170px** (`max-w-container`) |
| Cột đọc | **660px** (`max-w-reading`) |
| Thẻ giá | **696px** (`max-w-price`) |
| Nhịp dọc | `xl` 216px · `lg` 112px · `md` 80px · `sm` 64px |

## Bo góc và bóng

```
rounded-none 0 · rounded 4px · rounded-full
```

Không có bậc nào khác. Thẻ, panel, section, bảng, ảnh sản phẩm đều bo `0`.

Bóng: chỉ `shadow-overlay` cho lớp phủ nổi, và `shadow-focus` / `shadow-focus-dark`
cho vòng focus hai lớp.

## Chuyển động

| Tần suất gặp | Quyết định |
|---|---|
| Hàng trăm lần/ngày — `⌘K`, chuyển hội thoại, phân trang | **Cấm animate** |
| Vài chục lần/ngày — hover, dropdown | `duration-fast` 150ms |
| Thỉnh thoảng — dialog, drawer, toast | `duration` 200ms hoặc `duration-slow` 300ms |
| Hiếm — onboarding, trạng thái rỗng lần đầu | được phép có dụng ý thẩm mỹ |

| Class | Giá trị | Dùng |
|---|---|---|
| `ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | vào và ra — mặc định |
| `ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | di chuyển **trên** màn hình |
| `duration-press` | 160ms | phản hồi nhấn |

Cấm `ease-in` — nó trễ đúng lúc người dùng đang nhìn. Trần 300ms. Ra nhanh hơn vào.
Chỉ animate `transform` và `opacity`.

## Icon

| Bộ | Vai trò | Gọi |
|---|---|---|
| Lucide | mọi icon giao diện | `<span className="i-lucide-search size-4" />` |
| Simple Icons | logo thương hiệu, kênh tin nhắn | `<span className="i-simple-icons-zalo size-5" />` |
| Devicon | logo công nghệ, **chỉ** bề mặt hướng lập trình viên | `<span className="i-devicon-php size-5" />` |

Cấm: tự vẽ path SVG · Simple Icons làm icon giao diện · Lucide vẽ lại logo thương
hiệu · emoji làm icon cấu trúc.

## Logo Yona

| Tệp | Dùng ở | Gọi qua |
|---|---|---|
| `brand-assets/logo.png` | header/footer landing, màn auth, superadmin | `globalConfig.logo` |
| `brand-assets/logo_dark.png` | bản trắng, chỉ nền tối | `globalConfig.logoDark` |
| `brand-assets/logo_thumbnail.png` | icon vuông nhỏ | `LOGO_THUMBNAIL` |

**Wordmark cao tối thiểu `h-8`.** Mark đuôi cá voi cao hơn phần chữ; thấp hơn mức
này thì chữ "yona" tụt xuống dưới ngưỡng đọc được.

## Nút

```tsx
// resources/js/landing/components/Button.tsx
primary:   'bg-primary-600 text-neutral-0 hover:bg-primary-700 active:bg-primary-800'
secondary: 'border border-neutral-900 text-neutral-900 hover:border-neutral-700 hover:text-neutral-700'
```

Viền nút phụ màu **mực**, không phải xám nhạt: thứ bậc đã nằm ở tương phản
đặc/rỗng, viền xám nhạt làm nút phụ đọc ra như bị vô hiệu.

Cỡ: `md` cao 40px (`h-11` dưới 768px cho đủ đích chạm) · `sm` cao 32px (phải nới
vùng chạm lên 44px).

Chỉ `transform` có transition. Màu đổi tức thì, không fade.

## Nội dung hiển thị

| Cấm | Thay bằng |
|---|---|
| Gạch dài `—` `–` | gạch thường, tách câu, hoặc dấu phẩy / hai chấm |
| Tên giả (`Nguyễn Văn A`, `Người dùng 1`) | tên người Việt tự nhiên, dữ liệu trông như thật |
| Số chính xác giả (`99.99%`) | số thật, hoặc đánh dấu rõ là dữ liệu mẫu |
| Gợi ý cuộn, mũi tên nhấp nháy | bỏ hẳn |
| Nhãn phiên bản trong hero (`BETA`) | bỏ, trừ khi trang đang nói đúng về việc ra mắt |
| Chấm tròn trang trí trước mục nav | bỏ. Chỉ giữ khi chấm mang trạng thái thật |
| Đánh số section làm eyebrow (`01 / Tính năng`) | tên section nói thẳng nội dung |
| Nhãn thơ thẩn | nhãn nói thẳng chức năng |
