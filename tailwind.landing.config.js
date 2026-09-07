// Tailwind riêng cho trang chủ công khai.
//
// `tailwind.config.js` là bản port NGUYÊN của Chatwoot (thang màu/token của họ),
// nên trang chủ — mang từ nhánh `main` với hệ token khác hẳn — dùng config
// riêng qua chỉ thị `@config` trong resources/css/landing.css. Nhờ vậy hai hệ
// token không giẫm nhau và bundle dashboard không phình thêm tiện ích nào.
const { iconsPlugin, getIconCollections } = require('@egoist/tailwindcss-icons');

export default {
  darkMode: 'class',
  content: ['./resources/js/landing/**/*.{ts,tsx}', './resources/views/landing.blade.php'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Giá trị thật nằm ở biến CSS trong landing.css (sáng/tối), đây chỉ là cầu
      // nối để dùng được dạng tiện ích `bg-card`, `text-muted-foreground`…
      colors: {
        canvas: 'var(--canvas)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        border: 'var(--border)',
        ring: 'var(--ring)',
        sidebar: { primary: 'var(--sidebar-primary)', 'primary-foreground': 'var(--sidebar-primary-foreground)' },
      },
      borderRadius: {
        shell: 'var(--radius-shell)',
      },
    },
  },
  // Cùng bộ icon `i-lucide-*` với dashboard để không sinh hệ icon thứ hai.
  plugins: [iconsPlugin({ collections: getIconCollections(['lucide']) })],
};
