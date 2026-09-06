// Port từ shared/helpers/cache.js (+ LocalStorage.get/set) — bộ nhớ đệm hết hạn
// theo mốc thời gian ghi, dùng cho danh sách campaign của widget.
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000;

export function getFromCache<T>(key: string, expiry: number = DEFAULT_EXPIRY): T | null {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const { data, timestamp } = JSON.parse(raw) as { data: T; timestamp: number };
        if (Date.now() - timestamp > expiry) {
            window.localStorage.removeItem(key);
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

export function setCache(key: string, data: unknown): void {
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
        // Bỏ qua như bản gốc: bộ nhớ đệm hỏng không được làm hỏng luồng chính.
    }
}

export function clearCache(key: string): void {
    try {
        window.localStorage.removeItem(key);
    } catch {
        // Bỏ qua như bản gốc.
    }
}
