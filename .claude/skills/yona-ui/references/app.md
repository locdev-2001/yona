# Bề mặt ứng dụng — dashboard và superadmin

> **Đang chờ vòng 2.** Revamp dashboard sẽ viết lại phần lớn nội dung dưới đây,
> nên chưa cắt sâu theo khuôn bốn tầng như `landing.md`. Đừng coi là đã chốt.
>
> Kế thừa nguyên `SKILL.md` và `tokens.md`. Tệp này **chỉ ghi phần khác**: nơi
> agent làm việc hàng giờ với dữ liệu dày đặc, nên mật độ và nhịp khác bề mặt
> công khai.
>
> Số trong tệp này **chưa gắn nhãn nguồn** — phần lớn là `chưa kiểm`, chép từ bản
> doc 19/09. Gắn nhãn khi vòng 2 đụng tới.

## Ghi chú cho vòng 2

Đo 20/09: ảnh chụp dashboard 90-95% trắng, 0.6-1.2% điểm có màu. Đây là lý do bề
mặt công khai nhạt hơn tham chiếu 10 điểm, và **không khung ảnh hay cách cắt nào
chữa được** — đã thử chụp lại rộng 2.2:1 và ba kiểu cắt, đều không ăn thua.

Mảng màu của landing phụ thuộc chính giao diện này. Đưa vào tiêu chí của vòng 2.

## Cách dùng doc này

Đọc **§0 doc nền** trước, luôn luôn. Rồi:

| Đang làm gì | Đọc mục nào |
|---|---|
| Sửa config app | §2 |
| Dựng màn hình mới | §3 (khung) → §4 (component) |
| Bảng, danh sách, form | §4 |
| Trạng thái rỗng / tải / lỗi | §4.5 |
| Trước khi mở PR | §7 |

Token màu, icon, focus, nút, chuyển động, nội dung: **lấy nguyên từ doc nền**, không định nghĩa lại.

| Bề mặt | Entry |
|---|---|
| Dashboard | `app.blade.php` · `resources/js/dashboard/**` |
| Superadmin | `superadmin.blade.php` · `resources/js/superadmin/**` |

---

## §1. Khác biệt cốt lõi: mật độ

| | Công khai | Ứng dụng |
|---|---|---|
| Cỡ chữ thân | 16px | **14px** |
| Chiều cao control | 40px | **36px** |
| Nhịp dọc | 64–112px | **16–32px** |
| Bề rộng đọc | giới hạn 720px | **dùng hết bề ngang** |
| Weight nhãn | 400 | **500** |

Mật độ cao **không** đồng nghĩa với chật. Luật §0 doc nền giữ nguyên toàn bộ: không bóng, khối vuông, không chữ đậm.

### §1.1 Dưới 768px, mật độ nhường chỗ cho ngón tay

Mật độ desktop vi phạm ngưỡng chạm 44×44px. Inbox đã chạy trên điện thoại nên đây là ràng buộc thật.

| | ≥768px | <768px |
|---|---|---|
| Chiều cao control | 36px | **44px** |
| Hàng bảng / danh sách | 40px | **48px** |
| Mục menu, tab | 32px | **44px** |
| Icon bấm được | icon 20px trong ô 32px | icon 20px trong ô **44px** |

Cỡ chữ và khoảng cách giữ nguyên; chỉ **vùng bấm** nới ra. Viết thẳng trong class: `h-11 md:h-9`.

---

## §2. Tailwind config app

Giống doc nền §2 (cùng `colors`, `borderRadius`, `boxShadow`, `fontWeight`, `transitionTimingFunction`, `future.hoverOnlyWhenSupported`, `darkMode: []`, cùng plugin icon). Chỉ khác `fontSize`:

```js
// tailwind.config.js — chỉ phần khác doc nền §2
fontSize: {
  page:    ['1.25rem',   { lineHeight: '1.3',  letterSpacing: '-0.01em' }],  // tiêu đề trang
  section: ['1rem',      { lineHeight: '1.4' }],                             // tiêu đề khối
  base:    ['0.875rem',  { lineHeight: '1.5' }],                             // THÂN — 14px
  meta:    ['0.8125rem', { lineHeight: '1.45' }],                            // phụ, metadata
  label:   ['0.75rem',   { lineHeight: '1.3',  letterSpacing: '0.04em' }],   // nhãn, header cột
  micro:   ['0.6875rem', { lineHeight: '1.3',  letterSpacing: '0.02em' }],   // giờ, đếm
},
```

**Sàn line-height 1.3** ở app — dưới mức đó dấu tiếng Việt chồng vào hàng trên trong bảng.

Tiêu đề trang và tiêu đề khối dùng `font-medium` (500). Thân dùng `font-normal`.

---

## §3. Khung ứng dụng

```
┌────────┬──────────────────────────────────┐
│        │ Topbar 56px                      │
│Sidebar ├──────────────┬───────────────────┤
│ 240px  │ Danh sách    │ Nội dung          │
│        │ 320px        │ (cuộn riêng)      │
└────────┴──────────────┴───────────────────┘
```

```tsx
<div className="flex h-dvh overflow-hidden bg-neutral-0">
  <aside className="hidden w-60 shrink-0 border-r border-neutral-300 bg-neutral-50 md:block">…</aside>
  <div className="flex min-w-0 flex-1 flex-col">
    <header className="h-14 shrink-0 border-b border-neutral-300 px-4 md:px-6">…</header>
    <div className="flex min-h-0 flex-1">
      <div className="hidden w-80 shrink-0 overflow-y-auto border-r border-neutral-300 lg:block">…</div>
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">…</main>
    </div>
  </div>
</div>
```

**Bề mặt.** Cả hai doc dùng chung thang trung tính ấm ở [`design-system.md`](./design-system.md) §1 — `neutral-0` trắng, `neutral-50` giấy `#FAF9F6`, `neutral-900` mực `#111111`. App lấy **`neutral-0` làm nền vùng nội dung** vì bảng và chữ dày đặc đọc trên trắng rõ hơn; `neutral-50` làm chrome (sidebar, header bảng, hàng hover). Công khai thì ngược lại, xen kẽ trắng và giấy theo section.

Khung lưới dọc + dấu `+` của §7.1b **chỉ thuộc bề mặt công khai**. App đã có cấu trúc từ chính ba vùng của nó, thêm khung là nhiễu.

| Hạng mục | Giá trị |
|---|---|
| Sidebar | 240px · 64px khi thu gọn |
| Danh sách hội thoại | 320px |
| Panel ngữ cảnh phải | 320px |
| Topbar | 56px |
| Padding nội dung | `p-4` mobile · `p-6` desktop |
| Gap | 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 |

- Phân vùng bằng **viền `1px neutral-300`**, không bóng, không khoảng trống.
- **Chỉ vùng nội dung cuộn.** Sidebar, topbar, header danh sách đứng yên.
- Trang render **vào** khung; không trang nào tự dựng lại nav hay topbar.
- Dưới 768px: ba vùng thành ba cấp điều hướng, **không** nhồi ba cột.

### §3.1 Sidebar

```tsx
const NAV_ITEM = 'flex h-11 items-center gap-3 rounded px-3 text-base text-neutral-700 md:h-9 ' +
  'hover:bg-neutral-100 active:scale-[0.97] transition-transform duration-press ease-out ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:shadow-focus';
const NAV_ITEM_ACTIVE = 'bg-primary-50 text-primary-700';
```

Icon Lucide `size-4`. Không thanh chỉ báo bên trái, không đổi weight khi active.
Nhãn nhóm: `text-label font-medium uppercase text-neutral-500`.

### §3.2 Topbar

`bg-neutral-0 border-b border-neutral-300`. Chứa breadcrumb → tiêu đề trang (`text-page font-medium`) → hành động theo ngữ cảnh (phải). Không lặp lại điều hướng đã có ở sidebar.

---

## §4. Component dữ liệu

### §4.1 Bảng

```tsx
const TH  = 'sticky top-0 z-10 bg-neutral-50 border-b border-neutral-300 px-3 py-2 ' +
            'text-label font-medium uppercase text-neutral-500 text-left';
const TD  = 'border-b border-neutral-200 px-3 py-2 text-base text-neutral-700';
const TD_NUM = TD + ' font-num text-right';
const TR  = 'h-12 md:h-10 hover:bg-neutral-50';
const TR_SELECTED = 'bg-primary-50';
```

- **Không sọc vằn.** Viền đã đủ tách hàng.
- Cột số: `font-num`, căn phải. Không cần `tabular-nums` — bản Tnum (doc nền §1.2) đã đều bề rộng. Cột hành động cố định bên phải.
- Sắp xếp: header bấm được, có `aria-sort`, icon `i-lucide-chevron-up size-3`.
- Phân trang **phía máy chủ**. Danh sách dài phải ảo hoá.
- Một component bảng dùng chung duy nhất — không tự nối TanStack Table ở từng trang.
- **Chuyển trang, đổi sắp xếp, lọc: KHÔNG animate** (§0.10 doc nền).

### §4.2 Danh sách hội thoại

```tsx
const CONV_ITEM = 'flex gap-3 border-b border-neutral-200 p-3 text-left w-full hover:bg-neutral-50';
const CONV_ITEM_ACTIVE = 'bg-primary-50';
```

Cao 72px: avatar `size-10` · tên `text-base font-medium text-neutral-900` · tin cuối cắt một dòng `text-meta text-neutral-500 truncate` · giờ `text-micro text-neutral-500` góc phải trên · badge chưa đọc.
Mục đang mở: `bg-primary-50`, không viền trái, không đổi weight chữ.
Huy hiệu kênh: `<Avatar platform={inbox.platform} />` (badge tròn góc dưới) hoặc `<ChannelIcon inbox={inbox} />`. Logo là tệp tĩnh `public/brand-assets/platforms/{key}.svg` do kênh tự khai (`DeclaresPlatform`); không dùng class `i-simple-icons-*` (bộ này không đăng ký trong Tailwind nên không sinh CSS).

**Chuyển hội thoại KHÔNG animate.** Agent làm việc này hàng trăm lần mỗi ca.

**Vuốt trên mobile** (đóng, lưu trữ): spring theo doc nền §5.3, không duration cố định.

### §4.3 Bong bóng tin nhắn

```tsx
const BUBBLE = 'max-w-[640px] rounded px-3 py-2 text-base';
const BUBBLE_IN  = BUBBLE + ' bg-neutral-100 text-neutral-900 self-start';
const BUBBLE_OUT = BUBBLE + ' bg-primary-600 text-neutral-0 self-end';
```

Metadata (giờ, trạng thái gửi) `text-micro text-neutral-500`, **ngoài** bong bóng.
Tin mới về dùng `transition`, **không** `@keyframes` — tin về dồn dập thì keyframes khởi động lại từ 0 và giật.

### §4.4 Form

```tsx
const FIELD = 'h-11 md:h-9 w-full rounded border border-neutral-300 bg-neutral-0 px-3 text-base text-neutral-900 ' +
  'placeholder:text-neutral-400 ' +
  'focus-visible:border-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-primary-600 focus-visible:shadow-focus';
```

Nhãn trên ô: `text-label font-medium text-neutral-700 mb-1.5`. Nhóm trường cách nhau `gap-4`.
Trợ giúp `text-label text-neutral-500`. Lỗi `text-label text-danger` thay chỗ dòng trợ giúp.
Nút lưu **dính đáy** ở form dài: `sticky bottom-0 bg-neutral-0 border-t border-neutral-300 p-4`.

### §4.5 Rỗng / đang tải / lỗi

Bắt buộc có cả ba. Không để màn trắng.

```tsx
// Rỗng
<div className="flex flex-col items-center gap-2 py-16 text-center">
  <span className="i-lucide-inbox size-8 text-neutral-400" aria-hidden />
  <p className="text-section font-medium text-neutral-900">{title}</p>
  <p className="max-w-sm text-base text-neutral-500">{desc}</p>
  <button className={buttonClass('primary', 'sm')}>{action}</button>
</div>

// Đang tải — skeleton theo đúng hình dạng nội dung sắp hiện
<div className="h-10 w-full bg-neutral-100" />
```

- Skeleton **không nhấp nháy**, không shimmer. Không dùng spinner cho tải trang.
- Lỗi: nêu rõ chuyện gì hỏng + nút thử lại. **Không** hiện mã lỗi thô.
- Dữ liệu minh hoạ phải trông thật (doc nền §8) — không "Khách hàng 1", không "0123456789".

### §4.6 Lớp phủ

| | Quy cách |
|---|---|
| Dialog | `max-w-[560px] rounded-none bg-neutral-0 border border-neutral-300 shadow-overlay`. Nền mờ `bg-navy/40`. `transform-origin: center` |
| Dropdown | `rounded border border-neutral-300 bg-neutral-0 shadow-overlay`, mục `h-8 px-3 hover:bg-neutral-100`. `--origin` = vị trí trigger |
| Tooltip | `rounded bg-neutral-900 text-neutral-0 text-label px-2 py-1`, trễ 300ms; đã có một tooltip mở thì cái kế hiện **tức thì, không animation** |
| Toast | góc dưới phải, `rounded border-l-[3px]` màu trạng thái, tự ẩn sau 5s (lỗi thì không tự ẩn) |

Mọi lớp phủ vào từ `scale(0.95)` + `opacity: 0` — **không bao giờ** `scale(0)` (doc nền §3.8).

**Toast phải tạm dừng đếm giờ khi tab bị ẩn**, nếu không người dùng quay lại thì toast đã biến mất mà chưa ai đọc.

### §4.7 Tab

```tsx
const TAB = 'h-11 md:h-8 px-3 text-base text-neutral-500 border-b-2 border-transparent';
const TAB_ACTIVE = 'text-neutral-900 font-medium border-primary-600';
```

Không dùng tab kiểu viên nhộng.

### §4.8 Avatar

`rounded-full`, cỡ `size-6` · `size-8` · `size-10`. Không ảnh thì chữ cái đầu trên `bg-primary-100 text-primary-700`.
Chồng avatar: đè 8px (`-ml-2`), `ring-2 ring-neutral-0`, tối đa 3 + đếm phần dư.

---

## §5. Biểu đồ

Chuỗi màu theo thứ tự: `primary-600` → `cyan` → `warning` → `success` → `neutral-500`.
Lưới `neutral-200`. Nhãn trục `text-micro text-neutral-500 font-num`.
Không bóng, không gradient fill, không 3D.
Mọi biểu đồ phải đọc được **không qua màu** (nhãn trực tiếp hoặc chú giải có hình dạng).
Vẽ lần đầu được animate một lần ≤300ms; cập nhật realtime thì **không** animate.

---

## §6. Bàn phím & trợ năng

- Mọi hành động chính có đường đi bằng bàn phím. Thứ tự tab theo thứ tự thị giác.
- Bảng: mũi tên di chuyển hàng, `Enter` mở.
- Dialog: bẫy tiêu điểm, `Esc` đóng, trả tiêu điểm về nơi mở.
- Bảng lệnh `⌘K` là đường tắt, **không** phải đường duy nhất tới bất kỳ chức năng nào. **Mở và đóng không animate.**
- Vùng cập nhật realtime (tin nhắn mới): `aria-live="polite"`.
- Focus ring hai lớp (doc nền §3.3) — trên hàng bảng đang chọn (`bg-primary-50`) và trên nút primary, vòng một lớp biến mất.

---

## §7. Tự kiểm

### §7.1 Chạy được bằng máy

```bash
# Mọi lệnh phải trả về RỖNG
grep -rnE "shadow-(sm|md|lg|xl|2xl)|rounded-(sm|md|lg|xl|2xl)" resources/js/dashboard resources/js/superadmin
grep -rnE "font-(semibold|bold|extrabold|black)" resources/js/dashboard resources/js/superadmin
grep -rnE "#[0-9a-fA-F]{6}|text-\[|bg-\[|p-\[|rounded-\[|shadow-\[" resources/js/dashboard
grep -rn "dark:" resources/js/dashboard resources/js/superadmin       # §0.9 — không dark mode
grep -rn "backdrop-blur" resources/js/dashboard
grep -rn "—\|–" resources/js/dashboard lang/                          # dấu gạch dài
grep -rnE "\bodd:|\beven:" resources/js/dashboard                     # sọc vằn bảng

grep -rn "Inter\|tabular-nums" resources/js/dashboard                 # font cũ + thuộc tính vô tác dụng

# Cột số: mọi ô số phải có font-num. Đối chiếu bằng mắt số kết quả với số cột số thật.
grep -rn "font-num" resources/js/dashboard
```

### §7.2 Mắt người

- [ ] Chữ thân 14px, không phải 16px
- [ ] Mọi line-height ≥ 1.3
- [ ] Cột số dùng `font-num` và căn phải
- [ ] Dưới 768px vùng bấm nới theo §1.1 (control 44px, hàng 48px)
- [ ] Bảng dùng component chung, phân trang phía máy chủ, có `aria-sort`
- [ ] Có đủ ba trạng thái rỗng / đang tải / lỗi; dữ liệu mẫu trông thật
- [ ] Chuyển hội thoại, chuyển trang bảng, mở `⌘K`: **không animate**
- [ ] Vuốt trên mobile dùng spring
- [ ] Toast tạm dừng khi tab ẩn
- [ ] Chỉ vùng nội dung cuộn; sidebar và topbar đứng yên
- [ ] Dialog bẫy tiêu điểm và trả tiêu điểm khi đóng
- [ ] Focus ring thấy được trên hàng đang chọn và trên nút primary
- [ ] Icon giao diện chỉ Lucide; huy hiệu kênh chỉ Simple Icons

---

## Liên quan

- [`design-system.md`](./design-system.md) — nền tảng: token, icon, nút, focus, chuyển động, nội dung
- [`code-standards.md`](./code-standards.md) §0.5 tổ chức file UI · §17 i18n
