// Bề mặt công khai — theo docs/design-system.md §2.
// Các scale bên dưới GHI ĐÈ (không extend) scale mặc định của Tailwind: giá trị
// vi phạm design system đơn giản là không biên dịch ra gì. `shadow-md`,
// `rounded-lg`, `font-bold`, `text-4xl` không tồn tại — cấu hình tự chặn thay vì
// trông chờ người viết nhớ luật.
const { iconsPlugin, getIconCollections } = require('@egoist/tailwindcss-icons');

const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;
const scale = (name, steps) => Object.fromEntries(steps.map((s) => [s, rgb(`--c-${name}-${s}`)]));

export default {
  content: [
    './resources/js/landing/**/*.{ts,tsx}',
    './resources/js/shared/**/*.{ts,tsx}',
    './resources/views/landing.blade.php',
  ],
  darkMode: [], // §0.9 — sản phẩm chỉ có một chủ đề sáng
  future: {
    // Bọc mọi biến thể hover trong @media (hover:hover) and (pointer:fine).
    // Không có nó, trên cảm ứng hover kích hoạt khi chạm rồi dính lại.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    // `media` là ngoại lệ có chủ đích cho ảnh sản phẩm trên bề mặt công khai
    // (§0.3). Đặt tên riêng thay vì mở lại thang mặc định để cổng grep vẫn bắt
    // được rounded-md/lg/xl.
    borderRadius: { none: '0', DEFAULT: '4px', media: '8px', full: '9999px' },
    boxShadow: {
      none: 'none',
      overlay: '0 8px 24px rgb(1 23 64 / 0.12)', // chỉ dialog/popover/widget
      media: '0 12px 32px rgb(17 17 17 / 0.10)', // chỉ ảnh sản phẩm ở landing
      focus: '0 0 0 2px #FFFFFF', // khe trắng của vòng focus hai lớp
      'focus-dark': '0 0 0 2px #011740', // khe trên nền navy
    },
    fontWeight: { light: '300', normal: '400', medium: '500' },
    fontSize: {
      // Thang đo từ bề mặt tham chiếu: tiêu đề section 54px, không phải 28px.
      // Chênh lệch cỡ chữ CHÍNH LÀ thứ tạo nhịp cho trang — bóp nhỏ nó thì
      // trang đọc như bảng thông số.
      display: ['clamp(2rem, 5.6vw, 5rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      h1: ['clamp(1.75rem, 3.75vw, 3.375rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      h2: ['1.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      h3: ['1.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      h4: ['1rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
      lead: ['1.125rem', { lineHeight: '1.45', letterSpacing: '-0.01em' }],
      base: ['1rem', { lineHeight: '1.5' }],
      sm: ['0.875rem', { lineHeight: '1.5' }],
      // lh 1.2 chứ không phải 1.0 như đo được: nhãn eyebrow là chữ HOA tiếng Việt,
      // dấu chồng hai tầng (Ộ Ữ Ế) bị cắt dưới 1.05 — xem §0.5.
      eyebrow: ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.05em' }],
      caption: ['0.75rem', { lineHeight: '1.4' }],
    },
    extend: {
      fontFamily: {
        sans: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
        // CHỈ cột số. Bản Tnum không chứa chữ cái nên ký tự khác rơi về bản thường.
        num: ['Be Vietnam Pro Tnum', 'Be Vietnam Pro', 'system-ui', 'sans-serif'],
        // CHỈ cho nhãn eyebrow. Bản cắt 220 ký tự, không dùng cho văn bản chạy.
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        navy: rgb('--c-navy'),
        blue: rgb('--c-blue'),
        cyan: rgb('--c-cyan'),
        primary: scale('primary', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        neutral: scale('neutral', [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        success: rgb('--c-success'),
        'success-tint': rgb('--c-success-tint'),
        warning: rgb('--c-warning'),
        'warning-tint': rgb('--c-warning-tint'),
        danger: rgb('--c-danger'),
        'danger-tint': rgb('--c-danger-tint'),
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.23, 1, 0.32, 1)', // vào/ra — mặc định
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)', // di chuyển TRÊN màn hình
      },
      transitionDuration: { press: '160ms', fast: '150ms', DEFAULT: '200ms', slow: '300ms' },
      // price: thẻ giá rộng 696px trên container 1170 — đo được, và không biểu
      // diễn được bằng thang phân số vì khu nội dung đã trừ padding hai bên.
      maxWidth: { container: '1170px', reading: '660px', price: '696px' },
    },
  },
  plugins: [
    iconsPlugin({
      // lucide = icon giao diện · simple-icons = logo thương hiệu (§6)
      collections: getIconCollections(['lucide', 'simple-icons']),
    }),
  ],
};
