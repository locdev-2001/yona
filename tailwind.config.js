// `content` trỏ cây source React của Yona. Không tự "chuẩn hóa" scale màu/token.
const { slateDark } = require('@radix-ui/colors');
import { colors } from './theme/colors';
import { icons as yonaIcons } from './theme/yona-icons';
const defaultTheme = require('tailwindcss/defaultTheme');
const {
  iconsPlugin,
  getIconCollections,
} = require('@egoist/tailwindcss-icons');
const plugin = require('tailwindcss/plugin');

// Ẩn thanh cuộn nhưng vẫn cuộn được. Khai ở config gốc để mọi bề mặt (dashboard,
// widget, survey…) kế thừa qua tailwind/surface.cjs.
const hiddenScrollbarPlugin = plugin(({ addUtilities }) => {
  addUtilities({
    '.no-scrollbar': {
      '-ms-overflow-style': 'none',
      'scrollbar-width': 'none',
      '&::-webkit-scrollbar': { display: 'none' },
    },
  });
});

const defaultSansFonts = [
  '-apple-system',
  'system-ui',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Tahoma',
  'Arial',
  'sans-serif !important',
];

const tailwindConfig = {
  darkMode: [], // chế độ tối của portal đi qua biến màu (resources/scss/_dark-colors.scss), không dùng biến thể dark:
  content: [
    './resources/js/**/*.{ts,tsx,js,jsx}',
    './resources/views/**/*.blade.php',
    // Console /admin dựng bằng Tailwind 4 (resources/css/admin/app.css): cú pháp
    // class của nó (vd. `gap-[--spacing(...)]`) làm hỏng CSS Tailwind 3 nếu bị quét.
    '!./resources/js/admin/**',
    '!./resources/js/superadmin/**',
    '!./resources/views/superadmin*.blade.php',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: defaultSansFonts,
        inter: ['Inter', ...defaultSansFonts],
        interDisplay: ['InterDisplay', ...defaultSansFonts],
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
        bar: 'var(--shadow-bar)',
      },
      fontWeight: {
        420: '420',
        440: '440',
        460: '460',
        520: '520',
        620: '620',
      },
      typography: {
        bubble: {
          css: {
            color: 'rgb(var(--slate-12))',
            lineHeight: '1.6',
            fontSize: '14px',
            '*': {
              '&:first-child': {
                marginTop: '0',
              },
            },
            overflowWrap: 'anywhere',

            strong: {
              color: 'rgb(var(--slate-12))',
              fontWeight: '700',
            },

            b: {
              color: 'rgb(var(--slate-12))',
              fontWeight: '700',
            },

            h1: {
              color: 'rgb(var(--slate-12))',
              fontWeight: '700',
              fontSize: '1.25rem',
              '&:first-child': {
                marginTop: '0',
              },
            },
            h2: {
              color: 'rgb(var(--slate-12))',
              fontWeight: '700',
              fontSize: '1rem',
              '&:first-child': {
                marginTop: '0',
              },
            },
            h3: {
              color: 'rgb(var(--slate-12))',
              fontWeight: '700',
              fontSize: '1rem',
              '&:first-child': {
                marginTop: '0',
              },
            },
            hr: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
            },
            a: {
              color: 'rgb(var(--slate-12))',
              textDecoration: 'underline',
            },
            ul: {
              paddingInlineStart: '0',
              listStylePosition: 'inside',
            },
            ol: {
              paddingInlineStart: '0',
              listStylePosition: 'inside',
            },
            'ul > li': {
              marginBlockEnd: '0.5em',
              listStyleType: 'disc',
              paddingInlineStart: '1.5em',
              textIndent: '-1.5em',
            },
            'ol > li': {
              marginBlockEnd: '0.5em',
              listStyleType: 'decimal',
              paddingInlineStart: '1.5em',
              textIndent: '-1.5em',
            },
            'li > p:first-child': {
              display: 'inline',
            },
            'li > *': {
              textIndent: '0',
            },
            blockquote: {
              color: 'rgb(var(--slate-11))',
              borderLeft: `4px solid rgb(var(--black-alpha-1))`,
              paddingLeft: '1em',
              '[dir="rtl"] &': {
                borderLeft: 'none',
                paddingLeft: '0',
                borderRight: `4px solid rgb(var(--black-alpha-1))`,
                paddingRight: '1em',
              },
              '[dir="ltr"] &': {
                borderRight: 'none',
                paddingRight: '0',
              },
            },
            code: {
              backgroundColor: 'rgb(var(--alpha-3))',
              color: 'rgb(var(--slate-11))',
              padding: '0.2em 0.4em',
              borderRadius: '4px',
              fontSize: '0.95em',
              '&::before': {
                content: `none`,
              },
              '&::after': {
                content: `none`,
              },
            },
            pre: {
              backgroundColor: 'rgb(var(--alpha-3))',
              padding: '1em',
              borderRadius: '6px',
              overflowX: 'auto',
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
            },
            th: {
              padding: '0.75em',
              color: 'rgb(var(--slate-12))',
              border: `none`,
              textAlign: 'start',
              fontWeight: '600',
            },
            tr: {
              border: `none`,
            },
            td: {
              padding: '0.75em',
              border: `none`,
            },
            img: {
              maxWidth: '100%',
              height: 'auto',
              marginTop: 'unset',
              marginBottom: 'unset',
            },
          },
        },
      },
    },
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1900px',
    },
    fontSize: {
      ...defaultTheme.fontSize,
      xxxs: '0.5rem',
      xxs: '0.625rem',
    },
    colors: {
      transparent: 'transparent',
      white: '#fff',
      'modal-backdrop-light': 'rgba(0, 0, 0, 0.4)',
      'modal-backdrop-dark': 'rgba(0, 0, 0, 0.6)',
      current: 'currentColor',
      ...colors,
      body: slateDark.slate7,
    },
    // Chữ màu brand đặt trên bề mặt (sáng hoặc tối) nên đi theo thang blue-11; nền brand giữ
    // sắc đậm để chữ trắng đạt WCAG AA ở cả hai theme.
    textColor: ({ theme }) => ({
      ...theme('colors'),
      n: { ...theme('colors.n'), brand: 'rgb(var(--blue-11) / <alpha-value>)' },
    }),
    keyframes: {
      ...defaultTheme.keyframes,
      wiggle: {
        '0%': { transform: 'translateX(0)' },
        '15%': { transform: 'translateX(0.375rem)' },
        '30%': { transform: 'translateX(-0.375rem)' },
        '45%': { transform: 'translateX(0.375rem)' },
        '60%': { transform: 'translateX(-0.375rem)' },
        '75%': { transform: 'translateX(0.375rem)' },
        '90%': { transform: 'translateX(-0.375rem)' },
        '100%': { transform: 'translateX(0)' },
      },
      'fade-in-up': {
        '0%': { opacity: 0, transform: 'translateY(0.5rem)' },
        '100%': { opacity: 1, transform: 'translateY(0)' },
      },
      'loader-pulse': {
        '0%': { opacity: 0.4 },
        '50%': { opacity: 1 },
        '100%': { opacity: 0.4 },
      },
      'card-select': {
        '0%, 100%': {
          transform: 'translateX(0)',
        },
        '50%': {
          transform: 'translateX(1px)',
        },
      },
      shake: {
        '0%, 100%': { transform: 'translateX(0)' },
        '25%': { transform: 'translateX(0.234375rem)' },
        '50%': { transform: 'translateX(-0.234375rem)' },
        '75%': { transform: 'translateX(0.234375rem)' },
      },
      'call-ring': {
        '0%, 40%, 100%': { transform: 'rotate(0)' },
        '5%, 15%, 25%': { transform: 'rotate(-14deg)' },
        '10%, 20%, 30%': { transform: 'rotate(14deg)' },
      },
      'call-wave': {
        '0%': { transform: 'scale(1)', opacity: 0.5 },
        '100%': { transform: 'scale(1.4)', opacity: 0 },
      },
      'call-sweep': {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(100%)' },
      },
    },
    animation: {
      ...defaultTheme.animation,
      wiggle: 'wiggle 0.5s ease-in-out',
      'fade-in-up': 'fade-in-up 0.3s ease-out',
      'loader-pulse': 'loader-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      'card-select': 'card-select 0.25s ease-in-out',
      shake: 'shake 0.3s ease-in-out 0s 2',
      'call-ring': 'call-ring 1.6s ease-in-out infinite',
      'call-wave': 'call-wave 1.6s ease-out infinite',
      'call-sweep': 'call-sweep 2.4s ease-in-out infinite',
    },
  },
  plugins: [
    // eslint-disable-next-line
    require('@tailwindcss/typography'),
    hiddenScrollbarPlugin,
    iconsPlugin({
      collections: {
        yona: { icons: yonaIcons },
        // lucide = icon giao diện · logos, simple-icons = logo thương hiệu.
        // iconCollections.test.ts chặn lớp icon thuộc bộ ngoài danh sách này.
        ...getIconCollections(['lucide', 'logos', 'simple-icons']),
      },
    }),
  ],
};

module.exports = tailwindConfig;
