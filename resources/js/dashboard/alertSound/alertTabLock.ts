/**
 * Nhiều tab Yona cùng mở đều nhận cùng một `message.created`; chỉ một tab được kêu.
 * Mỗi tab ghi "tôi nhận tin X" vào bản ghi dùng chung (localStorage), chờ một nhịp
 * cho các tab khác ghi đè rồi đọc lại: ai còn đứng tên thì thắng. Tab đang được
 * mở ghi ngay, tab nền chờ lâu hơn rồi mới thử, nên tab người dùng đang nhìn thắng.
 * Tab thắng cũng giữ mốc lần kêu gần nhất để giãn cách tính chung mọi tab.
 */

export const INACTIVE_TAB_DEFER_MS = 300;

export const CLAIM_SETTLE_MS = 60;

const STORAGE_KEY = 'yona.alertSound.claim';

export interface AlertClaimRecord {
    claimKey: string | null;
    claimTabId: string | null;
    lastPlayedAt: number | null;
}

export interface AlertClaimStore {
    read(): AlertClaimRecord;
    write(record: AlertClaimRecord): void;
}

const EMPTY_RECORD: AlertClaimRecord = { claimKey: null, claimTabId: null, lastPlayedAt: null };

/** localStorage nếu dùng được (tab ẩn danh / bị chặn thì rơi về bộ nhớ của riêng tab này). */
export function browserClaimStore(): AlertClaimStore {
    let memoryRecord: AlertClaimRecord = EMPTY_RECORD;

    return {
        read() {
            try {
                const raw = window.localStorage.getItem(STORAGE_KEY);
                return raw ? { ...EMPTY_RECORD, ...(JSON.parse(raw) as Partial<AlertClaimRecord>) } : EMPTY_RECORD;
            } catch {
                return memoryRecord;
            }
        },
        write(record) {
            memoryRecord = record;
            try {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
            } catch {
                // Không ghi được thì chỉ tab này biết — vẫn kêu đúng trong phạm vi một tab.
            }
        },
    };
}

const waitFor = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));

interface AlertTabLockOptions {
    store?: AlertClaimStore;
    tabId?: string;
    wait?: (milliseconds: number) => Promise<void>;
}

export function createAlertTabLock({
    store = browserClaimStore(),
    tabId = Math.random().toString(36).slice(2),
    wait = waitFor,
}: AlertTabLockOptions = {}) {
    return {
        /** true nếu tab này là tab duy nhất được xử lý tin `claimKey`. */
        async claim(claimKey: string, isTabActive: boolean): Promise<boolean> {
            if (!isTabActive) await wait(INACTIVE_TAB_DEFER_MS);

            const current = store.read();
            if (current.claimKey === claimKey) return false;

            store.write({ ...current, claimKey, claimTabId: tabId });
            await wait(CLAIM_SETTLE_MS);

            const settled = store.read();
            return settled.claimKey === claimKey && settled.claimTabId === tabId;
        },

        lastPlayedAt(): number | null {
            return store.read().lastPlayedAt;
        },

        markPlayed(playedAt: number): void {
            store.write({ ...store.read(), lastPlayedAt: playedAt });
        },
    };
}

export type AlertTabLock = ReturnType<typeof createAlertTabLock>;
