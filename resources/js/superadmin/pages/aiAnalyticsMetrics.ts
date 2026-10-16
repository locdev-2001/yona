import { getLocale, t } from '../../i18n';

// Phép tính và định dạng của trang Phân tích AI. Giờ luôn hiển thị theo giờ Việt Nam,
// không theo múi giờ của trình duyệt.
export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export type UsageTotals = {
    turns: number;
    replies: number;
    handoffs: number;
    failed_turns: number;
    unsourced_blocks: number;
    model_calls: number;
    failed_calls: number;
    route_changes: number;
    latency_ms_total: number;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    cost_micro_usd: number;
    ai_agents: number;
};

export type AccountUsage = {
    accountId: number;
    name: string | null;
    aiAgents: number;
    turns: number;
    replies: number;
    handoffs: number;
    failed_turns: number;
    input_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    cost_micro_usd: number;
};

type CacheCounters = Pick<UsageTotals, 'input_tokens' | 'cache_read_tokens' | 'cache_write_tokens'>;

const MICRO_PER_USD = 1_000_000;

function intlLocale(): string {
    const locale = getLocale().replace('_', '-');

    return locale === 'vi' ? 'vi-VN' : locale;
}

// Tỉ lệ 0..1; null khi mẫu số bằng 0 (không có gì để chia).
export function ratio(part: number, whole: number): number | null {
    return whole > 0 ? part / whole : null;
}

// Token vào của nhà cung cấp không gồm phần đọc/ghi cache, nên mẫu số cộng cả ba.
export function cacheHitRatio(counters: CacheCounters): number | null {
    return ratio(counters.cache_read_tokens, counters.input_tokens + counters.cache_read_tokens + counters.cache_write_tokens);
}

export function averageLatencySeconds(totals: Pick<UsageTotals, 'latency_ms_total' | 'model_calls'>): number | null {
    const average = ratio(totals.latency_ms_total, totals.model_calls);

    return average === null ? null : average / 1000;
}

// Chênh lệch tương đối so với kỳ trước, theo %; null khi kỳ trước bằng 0.
export function relativeChange(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null || previous === 0) return null;

    return ((current - previous) / previous) * 100;
}

// Chênh lệch của một tỉ lệ, theo điểm phần trăm; null khi một trong hai kỳ không có tỉ lệ.
export function pointChange(current: number | null, previous: number | null): number | null {
    return current === null || previous === null ? null : (current - previous) * 100;
}

export function trendOf(change: number | null): 'up' | 'down' | 'flat' {
    if (change === null || Math.abs(change) < 0.05) return 'flat';

    return change > 0 ? 'up' : 'down';
}

export function formatSignedNumber(value: number, fractionDigits = 1): string {
    const formatted = new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: fractionDigits }).format(Math.abs(value));

    return `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatted}`;
}

export function formatCount(value: number): string {
    return new Intl.NumberFormat(intlLocale()).format(value);
}

export function formatCompact(value: number): string {
    return new Intl.NumberFormat(intlLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number | null): string {
    if (value === null) return '-';

    return new Intl.NumberFormat(intlLocale(), { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

// Chi phí lưu bằng micro-USD. Số nhỏ giữ đủ chữ số để không thành $0.00.
export function formatUsd(microUsd: number): string {
    const usd = microUsd / MICRO_PER_USD;
    const digits = usd === 0 || Math.abs(usd) >= 1 ? 2 : Math.abs(usd) >= 0.01 ? 3 : 4;

    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: digits }).format(usd);
}

export function formatSeconds(seconds: number | null): string {
    if (seconds === null) return '-';

    return t('ADMIN_AI_ANALYTICS.KPI.SECONDS', {
        value: new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(seconds),
    });
}

type VnParts = { weekday: number; day: string; month: string; hour: string; minute: string };

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function vnParts(date: Date): VnParts {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone: VN_TIME_ZONE,
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        })
            .formatToParts(date)
            .map(part => [part.type, part.value]),
    );

    return { weekday: WEEKDAY_INDEX[parts.weekday] ?? 0, day: parts.day, month: parts.month, hour: parts.hour, minute: parts.minute };
}

function weekdayLabel(index: number): string {
    return t('ADMIN_OPERATIONS.COMMON.WEEKDAYS').split(',')[index] ?? '';
}

// Ngày Việt Nam dạng Y-m-d (đã là ngày địa phương): giữa trưa UTC luôn rơi đúng ngày đó ở UTC+7.
function localDay(key: string): Date {
    return new Date(`${key}T12:00:00Z`);
}

// "T5 15/10"
export function formatDayKey(key: string): string {
    const parts = vnParts(localDay(key));

    return `${weekdayLabel(parts.weekday)} ${parts.day}/${parts.month}`;
}

// Giờ (ISO UTC) theo giờ Việt Nam: "14:00"
export function formatHourKey(iso: string): string {
    const parts = vnParts(new Date(iso));

    return `${parts.hour}:${parts.minute}`;
}

// "T5 15/10 14:00"
export function formatHourWithDay(iso: string): string {
    const parts = vnParts(new Date(iso));

    return `${weekdayLabel(parts.weekday)} ${parts.day}/${parts.month} ${parts.hour}:${parts.minute}`;
}

// Các giờ (ISO UTC) rơi vào 00:00 giờ Việt Nam: mốc đầu ngày cho trục của chuỗi theo giờ.
export function dayStarts(hours: string[]): string[] {
    return hours.filter(iso => vnParts(new Date(iso)).hour === '00');
}

// "T5 15/10" của một giờ (ISO UTC) theo giờ Việt Nam.
export function formatHourAsDay(iso: string): string {
    const parts = vnParts(new Date(iso));

    return `${weekdayLabel(parts.weekday)} ${parts.day}/${parts.month}`;
}

export type AccountSortKey = 'name' | 'aiAgents' | 'turns' | 'autonomy' | 'handoffs' | 'failed' | 'cache' | 'cost';

export type AccountSort = { key: AccountSortKey; direction: 'asc' | 'desc' };

export function accountSortValue(row: AccountUsage, key: AccountSortKey): number | string {
    switch (key) {
        case 'name':
            return (row.name ?? '').toLocaleLowerCase();
        case 'aiAgents':
            return row.aiAgents;
        case 'turns':
            return row.turns;
        case 'autonomy':
            return ratio(row.replies, row.turns) ?? -1;
        case 'handoffs':
            return ratio(row.handoffs, row.turns) ?? -1;
        case 'failed':
            return ratio(row.failed_turns, row.turns) ?? -1;
        case 'cache':
            return cacheHitRatio(row) ?? -1;
        case 'cost':
            return row.cost_micro_usd;
    }
}

export function sortAccounts(rows: AccountUsage[], sort: AccountSort): AccountUsage[] {
    const direction = sort.direction === 'asc' ? 1 : -1;

    return [...rows].sort((left, right) => {
        const a = accountSortValue(left, sort.key);
        const b = accountSortValue(right, sort.key);
        const order = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b);

        return order * direction || left.accountId - right.accountId;
    });
}
