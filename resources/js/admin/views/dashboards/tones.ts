// Màu theo NGHĨA cho cả console. Một chỉ số mang cùng một màu ở mọi trang (Tổng quan, hồ sơ tài khoản,
// Sức khoẻ kênh, Cảnh báo…). Chọn màu bằng MEANING_TONE, không chọn tone trực tiếp theo cảm tính.
// Mọi giá trị là token chuẩn yona-ui (resources/css/admin/app.css).
export type Tone = 'primary' | 'navy' | 'cyan' | 'success' | 'warning' | 'danger' | 'neutral'

// Bảng nghĩa → màu. Ba họ thực thể + ba trạng thái + trung tính:
// - primary: lưu lượng hội thoại (hội thoại, tin vào, tin ra, lượng tin)
// - navy:    hồ sơ (tài khoản, đăng ký, nhân viên, thành viên, liên hệ)
// - cyan:    kênh (hộp thư, kênh kết nối)
// - success: khoẻ / ổn (chỉ dùng cho chỉ số trạng thái, không cho tăng trưởng)
// - warning: có vấn đề, cần xem
// - danger:  hỏng, ngừng nhận tin, cảnh báo đang báo
// - neutral: vận hành / hệ thống / cấu hình, và mọi chỉ số "vấn đề" đang bằng 0
export const MEANING_TONE = {
  conversations: 'primary',
  messages: 'primary',
  accounts: 'navy',
  people: 'navy',
  inboxes: 'cyan',
  healthy: 'success',
  problem: 'warning',
  failing: 'danger',
  system: 'neutral'
} as const satisfies Record<string, Tone>

export type Meaning = keyof typeof MEANING_TONE

// Chỉ số đếm vấn đề (có vấn đề, ngừng nhận tin, đang báo, sự cố…): bằng 0 là tin tốt nên trung tính,
// không tô màu cảnh báo.
export const problemTone = (count: number, meaning: 'problem' | 'failing' = 'problem'): Tone =>
  count > 0 ? MEANING_TONE[meaning] : 'neutral'

// Ô vuông chứa biểu tượng / số thứ tự: LUÔN nền nhạt + biểu tượng đậm cùng họ. Console không có ô tô đặc.
// Cyan không mang chữ (yona-ui §7) nên biểu tượng trên nền cyan nhạt in navy.
export const TONE_CHIP: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-700',
  navy: 'bg-navy/10 text-navy',
  cyan: 'bg-cyan/15 text-navy',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  neutral: 'bg-neutral-100 text-neutral-700'
}

// Ô mang CHỮ (số thứ tự bước…): cùng quy tắc nền nhạt với TONE_CHIP.
export const TONE_BADGE: Record<Tone, string> = TONE_CHIP

// Vạch nhấn (đỉnh thẻ, mép trái ô số) và mảng màu không mang chữ.
export const TONE_RULE: Record<Tone, string> = {
  primary: 'bg-primary-600',
  navy: 'bg-navy',
  cyan: 'bg-cyan',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral-300'
}

export const TONE_BORDER: Record<Tone, string> = {
  primary: 'border-primary-600',
  navy: 'border-navy',
  cyan: 'border-cyan',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
  neutral: 'border-neutral-300'
}

// Chữ mang màu: mọi cặp đã đo ≥4.5:1 trên neutral-0 và neutral-50. Cyan không mang chữ nên in navy.
export const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary-700',
  navy: 'text-navy',
  cyan: 'text-navy',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-neutral-700'
}

// Nét / mảng biểu đồ theo tone. Chuỗi phân loại không mang nghĩa (kênh A, kênh B…) dùng CHART_SERIES.
export const CHART_SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

// Chuỗi phân loại (kênh A, kênh B…): chỉ lấy màu họ thực thể và trung tính, KHÔNG lấy màu trạng thái
// (warning / success / danger) để một kênh không trông như "có vấn đề" hay "khoẻ".
export const CATEGORY_SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--color-navy)', 'var(--chart-5)']

export const TONE_FILL: Record<Tone, string> = {
  primary: 'var(--chart-1)',
  cyan: 'var(--chart-2)',
  warning: 'var(--chart-3)',
  success: 'var(--chart-4)',
  neutral: 'var(--chart-5)',
  navy: 'var(--color-navy)',
  danger: 'var(--color-danger)'
}

// Thanh tiến độ tô theo tone (đè màu mặc định của Progress): rãnh nhạt, thanh đậm cùng họ.
export const TONE_PROGRESS: Record<Tone, string> = {
  primary: '**:data-[slot=progress-indicator]:bg-primary-600 **:data-[slot=progress-track]:bg-primary-50',
  navy: '**:data-[slot=progress-indicator]:bg-navy **:data-[slot=progress-track]:bg-navy/10',
  cyan: '**:data-[slot=progress-indicator]:bg-cyan **:data-[slot=progress-track]:bg-cyan/15',
  success: '**:data-[slot=progress-indicator]:bg-success **:data-[slot=progress-track]:bg-success-tint',
  warning: '**:data-[slot=progress-indicator]:bg-warning **:data-[slot=progress-track]:bg-warning-tint',
  danger: '**:data-[slot=progress-indicator]:bg-danger **:data-[slot=progress-track]:bg-danger-tint',
  neutral: '**:data-[slot=progress-indicator]:bg-neutral-500 **:data-[slot=progress-track]:bg-neutral-100'
}
