// Màu theo nghĩa cho console. Mọi giá trị là token chuẩn yona-ui (resources/css/admin/app.css):
// primary = mạch hội thoại, navy = hồ sơ / dữ liệu, success / warning / danger = trạng thái,
// cyan chỉ nằm trên nền navy (ô biểu tượng) hoặc làm nét biểu đồ (chart-2), không mang chữ.
export type Tone = 'primary' | 'navy' | 'cyan' | 'success' | 'warning' | 'danger' | 'neutral'

// Ô vuông chứa biểu tượng.
export const TONE_CHIP: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-700',
  navy: 'bg-navy text-neutral-0',
  cyan: 'bg-navy text-cyan',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  neutral: 'bg-neutral-100 text-neutral-700'
}

// Ô màu mang CHỮ (số thứ tự, nhãn): như TONE_CHIP, riêng cyan không mang chữ nên in trắng trên navy.
export const TONE_BADGE: Record<Tone, string> = { ...TONE_CHIP, cyan: 'bg-navy text-neutral-0' }

// Vạch nhấn (đỉnh thẻ, mép trái ô số). Cyan không đứng trên nền trắng nên dùng navy.
export const TONE_RULE: Record<Tone, string> = {
  primary: 'bg-primary-600',
  navy: 'bg-navy',
  cyan: 'bg-navy',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral-300'
}

export const TONE_BORDER: Record<Tone, string> = {
  primary: 'border-primary-600',
  navy: 'border-navy',
  cyan: 'border-navy',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
  neutral: 'border-neutral-300'
}

// Chữ mang màu: mọi cặp đã đo ≥4.5:1 trên neutral-0 và neutral-50.
export const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary-700',
  navy: 'text-navy',
  cyan: 'text-navy',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-neutral-700'
}

// Nét / mảng biểu đồ, theo thứ tự chuỗi app.md §5: primary-600 → cyan → warning → success → neutral-500.
export const CHART_SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export const TONE_FILL: Record<Tone, string> = {
  primary: 'var(--chart-1)',
  cyan: 'var(--chart-2)',
  warning: 'var(--chart-3)',
  success: 'var(--chart-4)',
  neutral: 'var(--chart-5)',
  navy: 'var(--color-navy)',
  danger: 'var(--color-danger)'
}

// Thanh tiến độ tô theo tone (đè màu mặc định của Progress).
export const TONE_PROGRESS: Record<Tone, string> = {
  primary: '**:data-[slot=progress-indicator]:bg-primary-600 **:data-[slot=progress-track]:bg-primary-50',
  navy: '**:data-[slot=progress-indicator]:bg-navy **:data-[slot=progress-track]:bg-neutral-100',
  cyan: '**:data-[slot=progress-indicator]:bg-cyan **:data-[slot=progress-track]:bg-neutral-100',
  success: '**:data-[slot=progress-indicator]:bg-success **:data-[slot=progress-track]:bg-success-tint',
  warning: '**:data-[slot=progress-indicator]:bg-warning **:data-[slot=progress-track]:bg-warning-tint',
  danger: '**:data-[slot=progress-indicator]:bg-danger **:data-[slot=progress-track]:bg-danger-tint',
  neutral: '**:data-[slot=progress-indicator]:bg-neutral-500 **:data-[slot=progress-track]:bg-neutral-100'
}

// Màu ổn định theo chuỗi (tên tài khoản…), để cùng một tài khoản luôn cùng màu ở mọi ô.
const IDENTITY_TONES: Tone[] = ['primary', 'navy', 'success', 'warning']

export const toneOf = (seed: string): Tone => {
  let hash = 0
  for (let index = 0; index < seed.length; index++) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0

  return IDENTITY_TONES[hash % IDENTITY_TONES.length]
}
