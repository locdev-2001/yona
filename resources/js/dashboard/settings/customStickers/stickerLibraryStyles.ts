// Lớp giao diện dùng chung cho màn kho sticker (tenant và Super Admin). Chỉ dùng màu
// tĩnh của theme (slate/woot/green/red/yellow) vì console Super Admin không nạp biến
// màu của dashboard. reset-base: console Super Admin tô xanh mọi <button> (button:not(.reset-base)).
// border-solid: CSS nền của dashboard đặt `button { border-style: none }`.

export const BUTTON_CLASS =
    'reset-base inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9';
export const PRIMARY_BUTTON_CLASS = `${BUTTON_CLASS} bg-woot-500 text-white hover:bg-woot-600`;
export const SECONDARY_BUTTON_CLASS = `${BUTTON_CLASS} border border-solid border-slate-200 bg-white text-slate-800 hover:bg-slate-50`;
export const DANGER_BUTTON_CLASS = `${BUTTON_CLASS} border border-solid border-red-200 bg-white text-red-700 hover:bg-red-50`;
export const ICON_BUTTON_CLASS =
    'reset-base inline-flex size-7 items-center justify-center rounded-md border border-solid border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
export const INPUT_CLASS =
    'min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-woot-500 focus:outline-none md:min-h-9';
export const TOGGLE_BUTTON_CLASS =
    'reset-base inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-md border border-solid px-3 py-1.5 text-sm font-medium active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9';
export const TOGGLE_ON_CLASS = 'border-woot-500 bg-woot-50 text-slate-900';
export const TOGGLE_OFF_CLASS = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

// Nền caro để thấy chỗ trong suốt (slate-200 / trắng).
export const CHECKERBOARD_STYLE = {
    backgroundColor: 'rgb(255 255 255)',
    backgroundImage: 'repeating-conic-gradient(rgb(226 232 240) 0% 25%, transparent 0% 50%)',
    backgroundSize: '16px 16px',
} as const;
