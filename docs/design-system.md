# Yona — Design System

> Chuẩn thị giác của toàn sản phẩm. Doc này là **thi hành được**: token dán thẳng, công thức component copy được, cấu hình tự chặn vi phạm.
> Bề mặt ứng dụng (dashboard, superadmin) → [`design-system-app.md`](./design-system-app.md).
> Status: live · Updated: 2026-09-19 · Stack: Tailwind **v3.4**, React 19, Inertia 2

## Cách dùng doc này

| Đang làm gì | Đọc mục nào |
|---|---|
| Bất cứ việc gì | **§0** (luật cứng) — luôn luôn |
| Dựng lại token / sửa CSS gốc | §1 → §2 |
| Viết component mới | §0 → §3 (copy công thức) → §9 |
| Viết chữ, chọn cỡ | §4 |
| Thêm animation | §5 |
| Chọn icon | §6 |
| Làm landing / portal / survey / widget / trang auth | §7 |
| Viết nội dung hiển thị | §8 |
| Trước khi mở PR | §9 + §10 |

### Bề mặt nào thuộc doc nào

| Doc | Bề mặt | Nguồn |
|---|---|---|
| **Doc này** | Landing · Portal help center · Survey · Widget · Trang auth | `resources/js/{landing,portal,survey,widget,v3}/**` |
| [`design-system-app.md`](./design-system-app.md) | Dashboard · Superadmin | `resources/js/{dashboard,superadmin}/**` |
| Cả hai | Component dùng chéo | `resources/js/shared/**` |

Trang auth (`v3/` — đăng nhập, đăng ký, đặt lại mật khẩu) thuộc doc này: người dùng gặp nó **trước khi** vào sản phẩm, và nó là form một cột chứ không phải màn hình dữ liệu dày đặc. Dùng bố cục như Survey (§7.4).

`shared/` phải thoả **cả hai** doc — component ở đó không được giả định mật độ của bên nào.

**Không suy diễn giá trị.** Mọi số nằm trong doc. Cần giá trị không có ở đây nghĩa là đang làm sai cách.

---

## §0. Luật cứng

Vi phạm một dòng là sai, không phải "chưa tối ưu".

1. **KHÔNG `box-shadow`.** Tách lớp bằng ba bậc bề mặt (§7.1) hoặc viền `1px neutral-300`. Hai ngoại lệ, không có cái thứ ba: lớp phủ nổi → `shadow-overlay`; ảnh sản phẩm ở landing → `shadow-media` (§7.2).
2. **KHÔNG `backdrop-filter`, KHÔNG gradient nền, KHÔNG glow.** Ngoại lệ: hoa văn chấm bi `.bg-dotfield` cho nền section bảng giá — hoa văn đều, không phải chuyển màu.
3. **Thẻ / panel / section / bảng bo `0`.** Nút, input, chip, tab, tooltip bo `4px` (`rounded`). Avatar `rounded-full`. Ngoại lệ: **ảnh sản phẩm ở landing** bo `8px` (`rounded-media`) — nó nằm trên một mảng màu nên cần tự tách khỏi nền (§7.2).
4. **KHÔNG `font-weight` ≥ 600.** Chỉ có 300 / 400 / 500. Nhấn mạnh bằng **màu**, không bằng độ đậm.
5. **Mọi `line-height` ≥ 1.05.** Dấu tiếng Việt chồng hai tầng (`Ế Ộ Ữ`) bị cắt dưới mức đó.
6. **Tracking đổi dấu ở 16px.** Trên 16px → âm (tới −0.03em). Dưới 16px → dương (tới +0.08em).
7. **Cột số dùng `font-num`.** Be Vietnam Pro bản thường có chữ số lệch bề rộng; `font-num` là bản cắt đều bề rộng của chính nó (§1.2).
8. **Chữ dùng bậc trung tính ≥ 500.** Tương phản ≥ 4.5:1. `primary-500` và `cyan` **không được mang chữ**.
9. **KHÔNG dark mode.** Không viết biến thể `.dark`, không nút chuyển chủ đề.
10. **Hành động lặp hàng trăm lần/ngày KHÔNG animate** — `⌘K`, chuyển hội thoại, phân trang, điều hướng bàn phím.
11. **Mọi thứ bấm được có `active:scale-[0.97]`.**
12. **Một họ icon một vai:** Lucide cho giao diện, Simple Icons cho logo thương hiệu. Không tự vẽ SVG.

---

## §1. Token — dán nguyên khối

Màu khai bằng **bộ ba kênh RGB**, không phải hex. Bắt buộc, vì Tailwind v3 cần dạng này thì `bg-primary-600/10` mới hoạt động. Khai bằng `#hex` hay `hsl()` là mọi modifier opacity chết lặng.

```css
/* resources/css/landing.css (và portal.scss / survey.scss / widget.scss) */
:root {
  /* Thương hiệu */
  --c-navy:  1 23 64;      /* #011740 — logo và dải tối, KHÔNG phải màu chữ */
  --c-blue:  0 125 255;    /* #007DFF — nhận diện, KHÔNG mang chữ */
  --c-cyan:  0 186 253;    /* #00BAFD — chỉ trên nền navy */

  /* Primary — hue 211 */
  --c-primary-50:  235 244 255;
  --c-primary-100: 209 231 255;
  --c-primary-200: 163 208 255;
  --c-primary-300: 107 179 255;
  --c-primary-400:  51 150 255;
  --c-primary-500:   0 125 255;   /* 3.91:1 — đồ hoạ */
  --c-primary-600:   0 104 214;   /* 5.31:1 — nền nút */
  --c-primary-700:   0  84 173;   /* 7.31:1 — link, hover nút */
  --c-primary-800:   0  64 133;
  --c-primary-900:   0  44  92;

  /* Trung tính ẤM (linen). Xám ngả xanh làm trang trông như template dựng sẵn;
     nền giấy ấm là thứ phân biệt một trang được thiết kế với một trang được sinh ra. */
  --c-neutral-0:   255 255 255;   /* #FFFFFF — nền gốc */
  --c-neutral-50:  250 249 246;   /* #FAF9F6 — dải xen kẽ */
  --c-neutral-100: 241 238 233;   /* #F1EEE9 — giếng ảnh, panel */
  --c-neutral-200: 232 229 223;
  --c-neutral-300: 222 219 214;   /* #DEDBD6 — viền tiêu chuẩn + khung lưới */
  --c-neutral-400: 168 163 153;   /* chỉ đồ hoạ, KHÔNG mang chữ */
  --c-neutral-500: 112 107 99;    /* 4.57:1 trên linen — bậc nhỏ nhất còn đạt AA */
  --c-neutral-600:  92  88  81;   /* 6.11:1 — chữ phụ */
  --c-neutral-700:  61  58  53;   /* 9.78:1 — chữ thân */
  --c-neutral-800:  38  36  33;
  --c-neutral-900:  17  17  17;   /* #111111 — chữ tiêu đề */

  /* Trạng thái — tất cả ≥5.4:1 trên trắng */
  --c-success: 11 122 68;    --c-success-tint: 231 247 238;
  --c-warning: 154 91 0;     --c-warning-tint: 254 243 226;
  --c-danger:  196 43 43;    --c-danger-tint:  253 236 236;
}
```

Tô màu: `rgb(var(--c-primary-600))`, mờ: `rgb(var(--c-primary-600) / 0.1)`.

**Chữ không dùng navy.** Navy là màu logo. Đặt nó làm màu tiêu đề thì mọi dòng chữ trên trang đều ngả xanh, và trang lập tức đọc như một template SaaS. Tiêu đề dùng `neutral-900` = `#111111`; navy chỉ xuất hiện ở logo.

**Nền ấm, không phải xám lạnh.** Ba bậc `neutral-0` / `50` / `100` là toàn bộ vốn liếng phân tầng của bề mặt công khai, và cả ba đều ngả vàng nhẹ. Đây là khác biệt cảm nhận lớn nhất giữa một trang có gu và một trang do máy sinh — lớn hơn cả bố cục.

### §1.1 Font — một họ chữ duy nhất

**Be Vietnam Pro** cho toàn bộ sản phẩm. Thiết kế cho tiếng Việt, dấu chồng hai tầng không bị cắt ở line-height chặt.

Chưa có trong repo. Tải weight 300/400/500 vào `resources/fonts/BeVietnamPro/`, self-host (không nhúng `<link>` Google Fonts).

```css
@font-face {
  font-family: 'Be Vietnam Pro';
  src: url('/fonts/BeVietnamPro/BeVietnamPro-Light.woff2') format('woff2');
  font-weight: 300; font-display: swap;
}
/* lặp lại cho 400 Regular và 500 Medium */
```

Inter và InterDisplay trong `resources/fonts/` là di sản, **gỡ bỏ** khi revamp xong.

**Ngoại lệ một-font: JetBrains Mono cho nhãn eyebrow.** Nhãn eyebrow cần dáng mono để không bị đọc nhầm thành chữ thân; Be Vietnam Pro không có bản mono. Ngoại lệ này **chỉ áp cho `text-eyebrow`**, không cho bất kỳ chỗ nào khác.

Bản dùng là bản cắt còn 220 ký tự (chữ hoa và thường Latin, đủ chữ cái tiếng Việt có dấu, chữ số, ít dấu câu) — **10 KB mỗi weight**. Sinh bằng `scripts/make-eyebrow-font.py`. Phải có đủ dấu tiếng Việt, nếu không `HỘP THƯ` mất glyph và rơi về font khác giữa chừng. Giấy phép OFL, giữ `OFL.txt` cạnh tệp font.

### §1.2 Bản chữ số đều bề rộng

Be Vietnam Pro **không có feature `tnum`** và chữ số của nó lệch bề rộng nặng — `1` rộng 385/1000em, `4` rộng 710. Cột số trong bảng sẽ nhảy mỗi lần giá trị đổi, và `font-variant-numeric: tabular-nums` đặt lên nó **không có tác dụng gì**.

Cách xử lý: sinh một bản cắt của **chính font đó** với mọi chữ số đặt về cùng bề rộng `713/1000em` và canh giữa, subset xuống chỉ chữ số cùng vài ký tự đi kèm. **3.8 KB mỗi weight, 20 glyph, không chứa chữ cái** — nên mọi ký tự không phải số tự rơi về font gốc.

```css
@font-face {
  font-family: 'Be Vietnam Pro Tnum';
  src: url('/fonts/BeVietnamPro/BeVietnamProTnum-Regular.woff2') format('woff2');
  font-weight: 400; font-display: swap;
}
/* lặp lại cho 300 Light và 500 Medium */
```

Cả ba weight dùng chung bề rộng `713` để cột vẫn khớp khi hàng tổng đổi sang `font-medium`.

Sinh bằng `scripts/make-tnum-font.py` (fontTools): lấy glyph gốc → đặt advance width về 713 → dịch outline canh giữa → subset `0123456789.,:%+-/ $` → xuất woff2. Chạy lại khi nâng cấp Be Vietnam Pro.

**Không cần `tabular-nums`** ở CSS — font đã tabular sẵn.

---

## §2. Tailwind config

Scale bị **cắt xuống chỉ còn giá trị hợp lệ**. `shadow-md`, `rounded-lg`, `font-bold`, `text-4xl` sẽ không biên dịch ra gì — cấu hình tự chặn thay vì trông chờ người nhớ luật.

```js
// tailwind.landing.config.js
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: ['./resources/js/landing/**/*.{ts,tsx}', './resources/views/landing.blade.php'],
  darkMode: [],                                  // §0.9 — không có dark mode
  future: { hoverOnlyWhenSupported: true },      // hover tự bọc @media (hover:hover)
  theme: {
    // GHI ĐÈ (không phải extend) — xoá scale mặc định để không gọi được giá trị sai
    borderRadius: { none: '0', DEFAULT: '4px', full: '9999px' },
    boxShadow: {
      none: 'none',
      overlay: '0 8px 24px rgb(1 23 64 / 0.12)',   // chỉ cho dialog/popover/widget
      focus: '0 0 0 2px #FFFFFF',                  // khe trắng của vòng focus
      'focus-dark': '0 0 0 2px #011740',           // khe trên nền navy
    },
    fontWeight: { light: '300', normal: '400', medium: '500' },
    // Thang đo là thứ tạo nhịp cho trang. `h1` = 54px ở 1440, KHÔNG phải 28px:
    // bóp nhỏ tiêu đề section thì trang đọc như bảng thông số, dù mọi thứ khác đúng.
    fontSize: {
      display:   ['clamp(2rem, 5.6vw, 5rem)',        { lineHeight: '1.05', letterSpacing: '-0.03em' }],  // 32 → 80px
      h1:        ['clamp(1.75rem, 3.75vw, 3.375rem)',  { lineHeight: '1.05', letterSpacing: '-0.03em' }], // 28 → 54px
      h2:        ['2rem',     { lineHeight: '1.1',  letterSpacing: '-0.025em' }],
      h3:        ['1.25rem',  { lineHeight: '1.2',  letterSpacing: '-0.01em' }],   // tiêu đề thẻ trong lưới 3 cột
      h4:        ['1rem',     { lineHeight: '1.4',  letterSpacing: '-0.01em' }],
      lead:      ['1.125rem', { lineHeight: '1.45', letterSpacing: '-0.01em' }],
      base:      ['1rem',     { lineHeight: '1.5' }],
      sm:        ['0.875rem', { lineHeight: '1.5' }],
      eyebrow:   ['0.75rem',  { lineHeight: '1.2',  letterSpacing: '0.1em' }],
      caption:   ['0.75rem',  { lineHeight: '1.4' }],
    },
    extend: {
      fontFamily: {
        sans: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
        // CHỈ cột số. Bản Tnum không có chữ cái nên ký tự khác tự rơi về font gốc.
        num:  ['Be Vietnam Pro Tnum', 'Be Vietnam Pro', 'system-ui', 'sans-serif'],
        // CHỈ nhãn eyebrow (§4.2). Bản cắt 220 ký tự, không dùng cho văn bản chạy.
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        navy: rgb('--c-navy'), blue: rgb('--c-blue'), cyan: rgb('--c-cyan'),
        primary: Object.fromEntries([50,100,200,300,400,500,600,700,800,900]
          .map((s) => [s, rgb(`--c-primary-${s}`)])),
        neutral: Object.fromEntries([0,50,100,200,300,400,500,600,700,800,900]
          .map((s) => [s, rgb(`--c-neutral-${s}`)])),
        success: rgb('--c-success'), 'success-tint': rgb('--c-success-tint'),
        warning: rgb('--c-warning'), 'warning-tint': rgb('--c-warning-tint'),
        danger:  rgb('--c-danger'),  'danger-tint':  rgb('--c-danger-tint'),
      },
      transitionTimingFunction: {
        out:    'cubic-bezier(0.23, 1, 0.32, 1)',      // vào/ra — mặc định
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',   // di chuyển TRÊN màn hình
      },
      transitionDuration: { press: '160ms', fast: '150ms', DEFAULT: '200ms', slow: '300ms' },
      // 1170px là bề rộng container; 660px là bề rộng đoạn văn còn đọc được.
      maxWidth: { container: '1170px', reading: '660px' },
    },
  },
  plugins: [
    require('@egoist/tailwindcss-icons').iconsPlugin({
      collections: require('@egoist/tailwindcss-icons')
        .getIconCollections(['lucide', 'simple-icons']),
    }),
  ],
};
```

**Gói icon** (repo dùng **pnpm**, không phải npm):

```bash
pnpm add -D @iconify-json/simple-icons @iconify-json/devicon
pnpm remove @iconify-json/material-symbols @iconify-json/teenyicons
```

Bốn bộ còn lại (`ri` · `ph` · `fluent` · `logos`) vi phạm §0.12 nhưng **chưa gỡ được** — dashboard đang dùng `i-ri-*` 365 lần, `i-ph-*` 31, `i-fluent-*` 6, `i-logos-*` 5. Gỡ khi revamp dashboard chuyển hết sang Lucide; gỡ sớm là vỡ build.

---

## §3. Công thức component

Copy nguyên. Không thêm dependency — repo compose class bằng `[...].filter(Boolean).join(' ')`, giữ đúng idiom đó (**không** dùng `cva`, chưa cài).

### §3.1 Nút

```tsx
// resources/js/landing/components/Button.tsx
const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-normal ' +
  'transition-transform duration-press ease-out active:scale-[0.97] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:shadow-focus ' +
  'disabled:pointer-events-none';

const VARIANT = {
  primary:   'bg-primary-600 text-neutral-0 hover:bg-primary-700 active:bg-primary-800 disabled:bg-neutral-200 disabled:text-neutral-400',
  secondary: 'border border-neutral-900 text-neutral-900 hover:border-neutral-700 hover:text-neutral-700 active:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-300',
  ghost:     'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-400',
  danger:    'bg-danger text-neutral-0 hover:bg-danger/90 disabled:bg-neutral-200 disabled:text-neutral-400',
} as const;

const SIZE = {
  md: 'h-10 px-3.5 text-base',   // 40px — mặc định
  sm: 'h-8  px-2.5 text-sm',     // 32px — phải nới vùng chạm lên 44px, xem §3.2
} as const;

export const buttonClass = (
  variant: keyof typeof VARIANT = 'primary',
  size: keyof typeof SIZE = 'md',
  extra = '',
) => [BASE, VARIANT[variant], SIZE[size], extra].filter(Boolean).join(' ');
```

Ghi chú bắt buộc:
- **Chỉ `transform` có transition.** Màu đổi tức thì, không fade.
- Nhãn vừa **một dòng** ở desktop, tối đa 3 từ cho CTA chính.
- **Một ý định một nhãn** trên toàn trang. "Dùng thử" + "Bắt đầu miễn phí" + "Đăng ký" cùng tồn tại = sai.

### §3.2 Đích chạm 44px cho control nhỏ

```tsx
// nút 32px vẫn phải có vùng chạm 44px
<span className="relative inline-flex">
  <button className={buttonClass('ghost', 'sm')}>…</button>
  <span className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2" aria-hidden />
</span>
```

### §3.3 Focus

```
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:shadow-focus
```

Trên nền navy đảo lại: `focus-visible:outline-neutral-0 focus-visible:shadow-focus-dark`.

Vòng một lớp biến mất trên nút primary và hàng bảng đang chọn — luôn dùng hai lớp. Không bao giờ `outline-none` mà không thay bằng chỉ báo khác.

### §3.4 Trường nhập liệu

```tsx
const FIELD = 'h-10 w-full rounded border border-neutral-300 bg-neutral-0 px-3 text-base text-neutral-900 ' +
  'placeholder:text-neutral-400 ' +
  'focus-visible:border-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:shadow-focus';
const FIELD_ERROR = 'border-danger';
```

```tsx
<label className="block">
  <span className="mb-1.5 block text-caption font-medium text-neutral-700">{label}</span>
  <input className={[FIELD, error && FIELD_ERROR].filter(Boolean).join(' ')} />
  {error && <span className="mt-1 block text-caption text-danger">{error}</span>}
</label>
```

Chữ ô nhập **16px** — dưới 16px iOS tự phóng to trang. Nhãn luôn trên ô, không dùng placeholder thay nhãn.

### §3.5 Thẻ

Nền trang là `neutral-50` (§7.1), nên thẻ trắng tự nổi lên mà không cần bóng.

```tsx
const CARD      = 'rounded-none bg-neutral-0 p-6';                              // mặc định
const CARD_EDGE = 'rounded-none bg-neutral-0 border border-neutral-300 p-6';    // khi cần viền rõ
const CARD_SUNK = 'rounded-none bg-neutral-100 p-6';                            // chìm xuống dưới nền
```

Chỉ dựng thẻ khi cần nhóm thật. Nhóm được bằng khoảng trắng hoặc một đường `border-t` thì không dựng thẻ.

### §3.6 Badge

```tsx
const BADGE = 'inline-flex items-center rounded px-2 py-0.5 text-caption font-medium';
const BADGE_TONE = {
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger:  'bg-danger-tint text-danger',
  info:    'bg-primary-50 text-primary-700',
  neutral: 'bg-neutral-100 text-neutral-700',
} as const;
```

Trạng thái **luôn kèm icon hoặc chữ**. Không dùng màu đơn độc để truyền nghĩa.

### §3.7 Link

```tsx
const LINK_PROSE = 'text-primary-700 underline underline-offset-2 hover:text-primary-800';
const LINK_NAV   = 'text-neutral-700 no-underline hover:text-neutral-900';
```

### §3.8 Vào/ra của lớp phủ

Không có thư viện animation trong repo — dùng CSS thuần, điều khiển bằng `data-state`.

```css
.overlay {
  transform-origin: var(--origin, center);
  transition: opacity 150ms var(--ease-out), transform 150ms var(--ease-out);
}
.overlay[data-state='closed'] {
  opacity: 0;
  transform: scale(0.95);   /* KHÔNG BAO GIỜ scale(0) */
}
```

- Dropdown / popover / tooltip: đặt `--origin` = **vị trí trigger**. Mặc định CSS là `center`, không khai thì popover phình ra từ giữa thay vì mọc từ nút.
- Dialog: giữ `center` — nó không neo vào trigger nào.
- Dùng `transition`, **không** `@keyframes`, cho thứ bị kích hoạt dồn dập (toast, danh sách thêm mục). Keyframes khởi động lại từ 0 khi bị ngắt.

---

## §4. Chữ

| Vai trò | Class | Cỡ | lh | ls | Weight |
|---|---|---|---|---|---|
| Display | `text-display` | clamp 40→80px | 1.05 | −0.03em | `font-normal` |
| Heading 1 | `text-h1` | clamp 32→54px | 1.05 | −0.03em | `font-normal` |
| Heading 2 | `text-h2` | 28px | 1.1 | −0.03em | `font-normal` |
| Heading 3 | `text-h3` | 24px | 1.15 | −0.02em | `font-normal` |
| Heading 4 | `text-h4` | 20px | 1.2 | −0.01em | `font-normal` |
| Lead | `text-lead` | 18px | 1.5 | −0.01em | `font-light` |
| Body | `text-base` | 16px | 1.5 | 0 | `font-normal` |
| Body nhỏ | `text-sm` | 14px | 1.5 | 0 | `font-normal` |
| Eyebrow | `text-eyebrow` | 12px | 1.2 | +0.08em | `font-medium uppercase` |
| Caption | `text-caption` | 12px | 1.4 | 0 | `font-normal` |

Tiêu đề 3–5 từ mới dùng `text-display`; dài hơn hạ xuống `text-h1`.

### §4.1 Nhấn mạnh bằng độ mờ

Tiêu đề nhiều dòng: dòng trọng tâm `text-neutral-900`, dòng còn lại **`text-neutral-900/50`** — cùng mực, hạ alpha. Cùng cỡ, cùng weight.

```tsx
<h1 className="text-display text-neutral-900/50">
  Gom mọi tin nhắn khách<br />
  <span className="text-neutral-900">về một hộp thư</span><br />
  và chốt đơn nhanh hơn
</h1>
```

Hạ alpha chứ **không** đổi sang `neutral-500`: `neutral-500` là một sắc độ khác, mắt đọc ra hai màu chữ. `neutral-900/50` là cùng một màu lùi lại, đúng thứ bậc mà không tạo màu mới.

**Sàn alpha là `/50`.** Dòng mờ vẫn là chữ mang nghĩa nên phải đạt 3:1 của chữ lớn: `/40` chỉ được 2.61:1, `/50` được 3.54:1. Đừng hạ thấp hơn cho "tinh tế".

Dùng alpha trên `color`, **không** dùng thuộc tính `opacity` (nó kéo theo cả icon và nền con).

### §4.2 Trần Eyebrow

Eyebrow luôn là `font-mono text-eyebrow font-medium uppercase text-neutral-500`. Dáng mono là thứ tách nó khỏi chữ thân — cùng font với thân thì nó chỉ là một dòng chữ nhỏ viết hoa.

Eyebrow là **một phần của bộ khung khối tính năng** (§7.2) nên mỗi khối tính năng được đúng một cái, kèm icon 16px.

Ngoài khối tính năng: **tối đa 2** eyebrow rời cho cả trang (ví dụ dải kênh, tiêu đề cột footer). Hero **không** có eyebrow.

Cấm hai eyebrow trong cùng một section.

### §4.3 Cột số

```tsx
<td className="font-num text-right">{formatCurrency(v)}</td>
```

Áp cho: tiền tệ, bộ đếm, thời lượng, dấu thời gian dạng số, mọi cột số trong bảng.
**Không** áp cho ô lẫn chữ và số — "12 tin nhắn" vẫn là `font-sans`.
Không cần thêm `tabular-nums`; bản Tnum (§1.2) đã đều bề rộng sẵn.

---

## §5. Chuyển động

### §5.1 Có nên animate không

| Tần suất người dùng gặp | Quyết định |
|---|---|
| Hàng trăm lần/ngày — `⌘K`, chuyển hội thoại, phân trang, điều hướng bàn phím | **Cấm animate** |
| Vài chục lần/ngày — hover, mở dropdown | `duration-fast` (150ms) |
| Thỉnh thoảng — dialog, drawer, toast | `duration` (200ms) hoặc `duration-slow` (300ms) |
| Hiếm — onboarding, trạng thái rỗng lần đầu | Được phép có dụng ý thẩm mỹ |

Mỗi animation phải trả lời được trong một câu: truyền đạt **thứ bậc**, **trình tự**, **phản hồi**, hay **thay đổi trạng thái**? Không trả lời được thì bỏ.

### §5.2 Token

| Class | Giá trị | Dùng cho |
|---|---|---|
| `ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Vào và ra. Mặc định |
| `ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Di chuyển/biến hình **trên** màn hình |
| `duration-press` | 160ms | Phản hồi nhấn |
| `duration-fast` | 150ms | Tooltip, popover |
| `duration` | 200ms | Dropdown, select |
| `duration-slow` | 300ms | Dialog, drawer |

- **Cấm `ease-in`** — nó trễ đúng lúc người dùng đang nhìn, giao diện thành ì.
- **Trần 300ms.**
- **Ra nhanh hơn vào.**
- **Chỉ animate `transform` và `opacity`.** Không animate `width`, `height`, `top`, `left`, `padding`, `margin`.
- Hover đã tự bọc `@media (hover:hover)` nhờ `hoverOnlyWhenSupported` ở §2 — không cần viết tay.

### §5.3 Spring — chỉ cho cử chỉ kéo

Vuốt đóng hội thoại, kéo drawer trên mobile: người dùng đổi ý giữa chừng thì duration cố định khởi động lại từ 0 và trông giật. Dùng spring `{ duration: 0.5, bounce: 0.15 }`, `bounce` tối đa `0.2`. Ngoài cử chỉ kéo: không spring, không nảy.

### §5.4 Giảm chuyển động

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-property: opacity, color, background-color, border-color !important; }
}
```

Bỏ chuyển vị và biến hình, **giữ** đổi màu và mờ dần. Giảm chuyển động nghĩa là ít và nhẹ hơn, không phải bằng không.

---

## §6. Icon

Ba bộ, phân vai nghiêm ngặt. Trong mỗi vai chỉ có đúng một bộ.

| Bộ | Vai trò | Cách gọi |
|---|---|---|
| **Lucide** | Mọi icon giao diện: điều hướng, hành động, trạng thái, rỗng | `<span className="i-lucide-search size-4" />` |
| **Simple Icons** | Logo thương hiệu: kênh tin nhắn, logo khách hàng | `<span className="i-simple-icons-zalo size-5" />` |
| **Devicon** | Logo công nghệ, **chỉ** ở bề mặt hướng lập trình viên | `<span className="i-devicon-php size-5" />` |

Đã kiểm: Simple Icons phủ đủ `zalo` `messenger` `telegram` `whatsapp` `line` `tiktok` `instagram` `facebook`.

Cỡ: `size-3` (12) · `size-4` (16) · `size-5` (20) · `size-6` (24). Không cỡ khác.

**Cấm:** tự vẽ path SVG · dùng Simple Icons làm icon giao diện · dùng Lucide vẽ lại logo thương hiệu · emoji làm icon cấu trúc (nav, nút, trạng thái, nhãn).

Emoji chỉ xuất hiện khi nó là **nội dung người dùng nhập** (tin nhắn, tên hội thoại, cảm xúc).

### §6.1 Logo và icon của chính Yona

Không nằm trong ba bộ trên. Chúng là ảnh tĩnh trong `public/`, đường dẫn đi qua `config('yona.branding.*')` để bản cài đặt trắng nhãn đổi được bằng env — **không hardcode đường dẫn trong component**.

| Tệp | Dùng ở | Gọi qua |
|---|---|---|
| `brand-assets/logo.png` | Header/footer landing, màn auth, superadmin | `globalConfig.logo` |
| `brand-assets/logo_dark.png` | Bản trắng, chỉ cho nền tối | `globalConfig.logoDark` |
| `brand-assets/logo_thumbnail.png` | Icon vuông nhỏ: "powered by", footer portal, sidebar superadmin | `LOGO_THUMBNAIL` |
| `favicon.ico` · `favicon-{16,32}x{16,32}.png` · `apple-touch-icon.png` | Tab và màn hình chính | `@include('partials.favicon')` |
| `app-icon-{192,512}.png` · `pwa-maskable-512x512.png` | Manifest | `route('site_manifest')` |
| `open-graph-1200x630.png` · `twitter-x-card-1200x675.png` | Thẻ xem trước khi chia sẻ | Meta trong `landing.blade.php` |

**Cao tối thiểu `h-8` cho wordmark.** Mark đuôi cá voi cao hơn phần chữ, thấp hơn mức này thì chữ "yona" tụt xuống dưới ngưỡng đọc được.

Thumbnail **phải vuông** — footer portal render nó bằng `w-4 h-4`, ảnh chữ nhật sẽ bị bóp méo.

Sinh lại khi bộ nhận diện đổi: `uv run --with pillow python scripts/make-brand-assets.py`. Script crop viền nhiễu alpha của bộ kit và dựng bản maskable nền đặc — chép thẳng file từ kit sẽ ra icon lẹm góc trên Android.

---

## §7. Bề mặt công khai

### §7.1 Nền và không gian chung

**Nền trang là `bg-neutral-0` (trắng), section xen kẽ nhảy xuống `bg-neutral-50` (giấy ấm).** Cả hai đều ngả vàng nhẹ; không có bậc xám lạnh nào trên bề mặt công khai.

Ba bậc bề mặt, không dùng bậc thứ tư:

| Bậc | Màu | Dùng |
|---|---|---|
| Gốc | `neutral-0` `#FFFFFF` | thân trang, nav, footer |
| Dải | `neutral-50` `#FAF9F6` | section xen kẽ |
| Giếng | `neutral-100` `#F1EEE9` | nền dưới ảnh sản phẩm, panel nhấn |

| Hạng mục | Giá trị |
|---|---|
| Thang gap | 4 · 8 · 12 · 16 · 24 · 32 |
| Gutter ngang | `px-4` (mobile) · `px-10` (≥768px) |
| Container tối đa | **1170px** (`max-w-container`) |
| Cột đọc | **660px** (`max-w-reading`) |
| Nhịp dọc lớn | `py-16` (mobile) · `py-28` = 112px (≥768px) |
| Nhịp dọc nhỏ | `py-10` · `py-16` = 64px — dải logo, dải phụ |
| Padding giếng ảnh | `p-3` · `p-8` |

Breakpoint: `375 · 768 · 1024 · 1440`.

### §7.1b Khung lưới của trang — BẮT BUỘC

Hai đường kẻ dọc `1px neutral-300` ở đúng mép container, chạy suốt chiều cao **mỗi** section, cộng một dấu `+` `8×8px` (`neutral-400`) ở bốn góc.

Đây không phải trang trí. Bề mặt công khai có nhiều khoảng trắng; không có khung, mỗi section trôi nổi riêng lẻ và trang mất cấu trúc — đó chính là cảm giác "do máy sinh ra". Khung lưới là thứ rẻ nhất biến khoảng trắng thành bố cục.

```tsx
<section className={`${surface} overflow-x-clip`}>          {/* clip: dấu + thò ra 4px */}
  <div className="mx-auto max-w-container py-16 md:py-28">
    <div className="relative px-4 md:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
        <span className="absolute inset-y-0 left-0  w-px bg-neutral-300" />
        <span className="absolute inset-y-0 right-0 w-px bg-neutral-300" />
        {/* 4 × PlusMark ở -left-1/-right-1 × -top-1/-bottom-1 */}
      </div>
      {children}
    </div>
  </div>
</section>
```

Chỉ hiện từ `md`. Dưới 768px container chạm mép nên đường kẻ vô nghĩa.

### §7.2 Landing — mười section, thứ tự cố định

**Nav:** cố định, cao 64px, `bg-neutral-0` đặc, **không viền dưới, không bóng, không blur**. Một dòng ở ≥1024px.

| # | Section | Bề mặt | Nhịp | Nội dung |
|---|---|---|---|---|
| 1 | Hero | `base` | `md` 80px | h1 `text-display` 3 dòng căn giữa · đoạn dẫn · **2 nút** · dòng gỡ rào · cụm 5 tranh |
| 2 | Ảnh sản phẩm | `band` | `md` | nhãn `text-h2` nửa mờ nửa đậm · **segmented control** chia đôi cả bề rộng · giếng `tone-sand` |
| 3 | Dải kênh | `base` | `sm` 64px | eyebrow mono căn giữa · lưới 4 cột × 3 hàng, icon **đơn sắc** · ghi chú |
| 4 | Tính năng A | `band` | `lg` 112px | bộ khung đầy đủ, media rộng |
| 5 | Tính năng B | `base` | `lg` | khung chữ như A, media **chia đôi** |
| 6 | Tính năng C | `band` | `lg` | khung chữ như A, media **ba ảnh vuông** ba tông nền |
| 7 | Bốn bước | `base` | `md` | eyebrow · h1 · 4 cột, số thứ tự `font-mono`. **Cố tình không ảnh** — nằm giữa hai section có hình nên đây là quãng nghỉ |
| 8 | Nguyên tắc | `band` | `lg` | lưới 4 cột, **mỗi ô một tranh vuông** phía trên tiêu đề |
| 9 | Bảng giá | `panel` **tràn mép** | `md` | h1 căn giữa · một thẻ giá · 2 nút · chữ nhỏ |
| 10 | Kết trang | `base` | `xl` **216px** | `text-display` căn giữa · 2 nút · 6 tranh rải **khắp bề ngang**, cả trên lẫn dưới |

**Hai nút ở mọi section có CTA, kể cả hero.** Nút lẻ trôi giữa khoảng trắng là dấu hiệu rõ nhất của trang dựng máy.

**Khối tính năng — khung chữ cố định, media ĐỔI DẠNG:**

Phần chữ lặp nguyên văn ở cả ba khối:

```
nhãn eyebrow (chấm vuông + chữ mono)
  (tranh nét mực ở nửa phải, cùng hàng với tiêu đề)
tiêu đề hai dòng           ← text-h1 (54px), ngắt dòng bằng <br> có chủ đích
đoạn dẫn                   ← text-base font-light, max-w-reading
hai nút                    ← CtaPair: primary + secondary viền 1px
```

Phần media thì **mỗi khối một dạng**:

| Khối | Dạng media | Sau media |
|---|---|---|
| A | một ảnh rộng trong giếng màu | lưới 3 cột, ô đầu có nền `neutral-100` |
| B | **chia đôi**: ảnh trong panel trái, các mục mở/đóng bên phải, mục đang mở có nền | — |
| C | **ba ảnh vuông**, mỗi ảnh một tông nền khác | lưới 3 cột, h3 lên `text-h2` |

Lặp một dạng media cho cả ba khối là lỗi: khối thứ hai sẽ đọc y hệt khối thứ nhất, và trang mất một nhịp.

**Lưới 3 cột không có `border-t`** và link "Tìm hiểu thêm" **không có mũi tên** — ba mũi tên cạnh nhau đọc thành hoa văn chứ không thành ba hành động.

**Giếng ảnh có tông màu riêng.** Ảnh chụp không bao giờ đặt trần lên nền trang. Nó nằm giữa một mảng màu rộng (`neutral-100` · `tone-sage` · `tone-sand`), với lề `p-4 md:p-12`, bo `8px` và `shadow-media`.

Mảng màu quanh ảnh mới là thứ cho khối media sức nặng. Ảnh phủ kín giếng thì khối chỉ còn là cái khung, và ảnh dán phẳng trên nền trắng là lý do media của trang dựng máy trông rỗng. Ba khối tính năng dùng ba tông khác nhau để chúng không đọc thành một mảng duy nhất.

**Ảnh chụp sản phẩm — bắt buộc:**
- Chụp **giao diện thật, dữ liệu thật, đúng ngôn ngữ trang đang render**. Ảnh tiếng Anh trên trang tiếng Việt là lỗi nội dung.
- Mỗi khối một ảnh **khác nhau**. Dùng lại một ảnh cho hai khối là lỗi.
- **Cấm** `object-cover`: ảnh đã cắt sẵn, cover phóng to rồi cắt tiếp và thường rơi vào một góc trắng. Dùng `h-auto w-full` kèm `width`/`height` gốc.
- **Cấm** khung giữ chỗ nét đứt và "ảnh sản phẩm" dựng bằng `<div>` trong bản ship.
- Tránh ảnh có thao tác phá huỷ (nút xoá màu đỏ) hay trạng thái rỗng.

**Footer:** `bg-neutral-0`, **có** `border-t neutral-300`. Tiêu đề cột `text-eyebrow` mono. Link `text-sm`. Có **hàng cuối riêng** (bản quyền + một dòng định vị) tách bằng `border-t`. Chỉ liệt kê đích thật sự tồn tại.

### §7.2b Tranh trang trí

Tiêu đề căn giữa để trống hai bên; tiêu đề 54px căn trái để trống nửa phải. Tranh trang trí lấp đúng chỗ đó. Không có nó, hero và section kết chỉ là chữ trôi trên nền trắng — đây là khác biệt lớn nhất giữa một trang được thiết kế và một trang được sinh ra.

| Ràng buộc | Luật |
|---|---|
| Nguồn | **Chỉ tác phẩm thuộc phạm vi công cộng / CC0** có thể kiểm chứng. Hiện dùng Art Institute of Chicago. |
| Xuất xứ | Mỗi ảnh ghi tác phẩm, tác giả, niên đại, bộ sưu tập, giấy phép, URL vào `public/landing/art/CREDITS.json` |
| Cắt | **Giữ nguyên tỉ lệ gốc.** Cắt tranh theo khung cố định là chặt mất bố cục — sẽ ra đuôi cá hoặc con hạc cụt đầu. Chỉ giới hạn cạnh dài. |
| Định dạng | WebP, xuất 2× cho màn retina, `quality 84` |
| Ngữ nghĩa | `aria-hidden`, `alt=""`, `pointer-events-none select-none`, `loading="lazy"` |
| Ngưỡng hiện | **`xl` (1280px) cho mọi vị trí.** Dưới ngưỡng container co lại nhưng tranh thì không, nên khoảng lệch âm kéo tranh vào đè lên chữ — đo ở 1024 thấy cả cụm hero đè lên h1. Dưới ngưỡng phải **ẩn hẳn**. |
| Bố cục | **Chồng lấn thành cụm**, mỗi cụm có ít nhất một tấm tràn hẳn khỏi mép màn hình. Xếp rời từng tấm cách đều là thứ làm chúng trông như tranh treo tường. |
| Chất ảnh | **Không dùng ảnh chụp hiện vật có nền phòng chụp** — mảng xám đó trên nền trắng của trang đọc ra như lỗi. Ưu tiên tranh, hoa văn dệt, trường màu. |
| Đa dạng | Bộ ảnh phải **lệch nhau về thể loại** (tranh sơn dầu, hoa văn, trừu tượng, phong cảnh). Một bộ đồng chất trông như bộ sưu tập bảo tàng, không như art direction. |
| Tràn mép | Được phép tràn khỏi container; section phải có `overflow-x-clip` nếu không trang trượt ngang |

Loại chủ đề không hợp trang bán hàng: chân dung nhìn thẳng, tượng tôn giáo, khoả thân, thú bị thương. Trang trí phải lùi lại, không kể chuyện riêng của nó.

**Đo được sức nặng.** Trang trí tồn tại để bù mảng tối và mảng màu. Đo trên ảnh chụp toàn trang: tỉ lệ điểm ảnh tối (`L < 120`) và điểm ảnh có màu (`saturation > 0.25`). Bề mặt tham chiếu ở 2.5% tối / 3.3% có màu. Lệch xuống dưới một nửa thì trang đọc ra nhạt và loãng, dù mọi token đều đúng.

### §7.3 Portal help center

- Hai cột ≥1024px: điều hướng danh mục trái 240px, nội dung phải tối đa **720px**.
- Bài viết: thân `text-base`, H2 trong bài `text-h3`, H3 `text-h4`.
- Khối code: `bg-neutral-100 rounded p-4 font-mono`, không viền.
- **Chủ đề màu theo tenant** (`portalThemeHelper.ts`): màu tenant chỉ thay `primary-600/700`. Trung tính, chữ, hình khối **không đổi**. Màu tenant phải qua kiểm tương phản ≥4.5:1; không đạt thì rơi về `primary-600`.

### §7.4 Survey

Một cột, tối đa 560px, căn giữa dọc. Nút chọn dùng biến thể `secondary`; trạng thái chọn → `border-primary-600 bg-primary-50`. Không tiến trình nhiều bước nếu chỉ có một câu hỏi.

### §7.5 Widget

Sống trong iframe **trên website của người khác** — bề mặt duy nhất có luật riêng.

- **Font không kế thừa từ host** → nhúng Be Vietnam Pro trong bundle widget.
- Thang chữ rơi một bậc: thân `text-sm`, tiêu đề `text-base`.
- Bong bóng bo `4px`. Tin của khách `bg-primary-600 text-neutral-0`; tin của agent `bg-neutral-100 text-neutral-900`.
- Khung ngoài được dùng `shadow-overlay` — nó thật sự nổi trên trang người khác.

**Tenant tự chọn màu widget:**
- Tenant chỉ đổi được **màu nhấn** (bong bóng khởi động, nền tin của khách, nút gửi).
- Màu tenant phải đạt ≥4.5:1 với chữ đặt trên nó; không đạt thì hệ tự đảo chữ sang `neutral-0` hoặc `navy`, chọn cái nào đạt.
- Trung tính, hình khối, thang chữ, chuyển động: tenant **không** đổi được.
- Tenant chọn màu tối thì widget **vẫn là giao diện sáng có nhấn tối** — không biến thành dark mode.

---

## §8. Nội dung hiển thị

Áp cho mọi chữ người dùng nhìn thấy: tiêu đề, nhãn, nút, chú thích, thông báo lỗi, trạng thái rỗng.

| Cấm | Thay bằng |
|---|---|
| Dấu gạch dài `—` `–` | Gạch thường `-`, tách câu, hoặc dấu phẩy / hai chấm. Khoảng giá trị: `2018-2026` |
| Tên giả (`Nguyễn Văn A`, `Người dùng 1`) | Tên người Việt tự nhiên; email, số điện thoại, tên công ty trông như thật |
| Số chính xác giả (`99.99%`, `1.000.000`) | Số thật, hoặc đánh dấu rõ là dữ liệu mẫu |
| Gợi ý cuộn ("Cuộn xuống", mũi tên nhấp nháy) | Bỏ hẳn |
| Nhãn phiên bản trong hero (`BETA`, `v2.0`) | Bỏ, trừ khi trang đang nói đúng về việc ra mắt |
| Chấm tròn trang trí trước mục nav / badge / dòng | Bỏ. Chỉ giữ khi chấm mang trạng thái thật (đang online) |
| Đánh số section làm eyebrow (`01 / Tính năng`) | Tên section nói thẳng nội dung |
| Nhãn thơ thẩn ("Ghi chép từ hiện trường") | Nhãn nói thẳng chức năng |

Trích dẫn ≤ **3 dòng**, ghi nguồn đủ tên + vai trò. Một giọng văn cho cả trang.

---

## §9. Luật code

- Token khai **một chỗ** cho mỗi bundle. Giá trị lấy từ §1, không tự chế.
- **Cấm hex/rgb thô trong component** (`text-[#111]`, `style={{color:'#…'}}`).
- **Cấm arbitrary value** cho spacing/size/radius/shadow (`p-[13px]`, `rounded-[18px]`). Ngoại lệ đã duyệt: `active:scale-[0.97]`.
- **Cấm `style={{}}` tĩnh.** Chỉ cho giá trị tính động thật (bề rộng thanh biểu đồ).
- Nhiều dáng vẻ → **map biến thể** một chỗ như §3.1, không `className={cond ? … : …}` rải rác.
- Pattern xuất hiện lần thứ 3 → tách component dùng chung **trước khi** lần thứ 3 ship.
- Không hard-code chuỗi người-dùng-thấy; mọi nhãn qua `t()`. Bố cục chịu tiếng Việt dài hơn tiếng Anh ~30% — nav, nút, badge phải xuống dòng được, không cắt chữ.
- Tổ chức thư mục theo [`code-standards.md`](./code-standards.md) §0.5.

---

## §10. Tự kiểm

### §10.1 Chạy được bằng máy

```bash
# Cấm tuyệt đối — mọi lệnh phải trả về RỖNG
grep -rnE "shadow-(sm|md|lg|xl|2xl)|rounded-(sm|md|lg|xl|2xl)" resources/js/landing
grep -rnE "font-(semibold|bold|extrabold|black)" resources/js/landing
grep -rnE "#[0-9a-fA-F]{6}|text-\[|bg-\[|p-\[|rounded-\[|shadow-\[" resources/js/landing
grep -rn "backdrop-blur\|dark:" resources/js/landing
grep -rn "—\|–" lang/vi/landing.php lang/en/landing.php   # gạch dài trong chuỗi người dùng thấy
grep -rnE "text-(xs|lg|xl|[2-9]xl)" resources/js/landing   # cỡ ngoài scale §4
grep -rn "Inter\|tabular-nums" resources/js/landing        # font cũ + thuộc tính vô tác dụng

# Eyebrow: mỗi khối tính năng một cái + tối đa 2 cái rời cho cả trang (§4.2)
grep -rn "text-eyebrow" resources/js/landing

# Mọi tranh trang trí phải có xuất xứ trong CREDITS.json (§7.2b) — lệnh trả RỖNG
comm -23 \
  <(ls public/landing/art/*.webp | xargs -n1 basename | sed 's/^/art\//' | sort) \
  <(python3 -c "import json;[print(a['tep']) for a in json.load(open('public/landing/art/CREDITS.json'))['anh']]" | sort)
```

### §10.2 Mắt người

- [ ] Hero lọt màn hình đầu ở 1440 và 375; CTA thấy được không cần cuộn
- [ ] Nav một dòng ở 1024px
- [ ] Mọi khối tính năng dùng **cùng** bộ khung §7.2; bề mặt `base`/`band` xen kẽ
- [ ] Lưới 3 cột chỉ xuất hiện ở vị trí của nó trong bộ khung, không dựng thêm hàng thẻ rời
- [ ] Khung lưới dọc + dấu `+` hiện đủ ở mọi section từ 768px
- [ ] Tranh trang trí KHÔNG đè lên chữ ở 1024 · 1280 · 1440; ẩn hẳn dưới ngưỡng
- [ ] Hero đúng MỘT nút; các khối còn lại đúng hai
- [ ] Có ảnh thật; không "ảnh sản phẩm" dựng bằng `<div>`, không khung nét đứt
- [ ] Ảnh chụp **đúng ngôn ngữ trang đang render**; mỗi khối một ảnh khác nhau
- [ ] Cuộn hết trang rồi mới chụp kiểm tra — ảnh `loading="lazy"` không tự nạp khi chụp full-page
- [ ] Nhãn CTA vừa một dòng; một ý định một nhãn
- [ ] Dữ liệu mẫu trông thật
- [ ] Focus ring thấy được trên nền trắng **và** trên nút primary
- [ ] Vùng bấm ≥44×44px
- [ ] Popover mọc ra từ trigger, không phình từ giữa
- [ ] Bật `prefers-reduced-motion` — trang vẫn dùng được, chỉ mất chuyển vị
- [ ] Render đúng ở 375 · 768 · 1024 · 1440

---

## Liên quan

- [`design-system-app.md`](./design-system-app.md) — bề mặt ứng dụng
- [`code-standards.md`](./code-standards.md) §0.5 tổ chức file UI · §17 i18n
