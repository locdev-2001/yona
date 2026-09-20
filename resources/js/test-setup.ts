import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom 30 qua vitest không gắn localStorage/sessionStorage vào global, nên mọi
// test đụng tới chúng nổ `Cannot read properties of undefined`. Shim tối thiểu,
// đủ ngữ nghĩa Storage cho test; code sản phẩm vẫn dùng Storage thật của trình duyệt.
function inMemoryStorage(): Storage {
    const data = new Map<string, string>();
    const api: Storage = {
        get length() {
            return data.size;
        },
        key: index => [...data.keys()][index] ?? null,
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => void data.set(key, String(value)),
        removeItem: key => void data.delete(key),
        clear: () => data.clear(),
    };

    // Storage thật cho phép truy cập khóa như thuộc tính (`localStorage.theme`),
    // không chỉ getItem/setItem — Proxy để hai lối vào cùng đọc một kho.
    return new Proxy(api, {
        get: (target, prop) =>
            typeof prop === 'string' && !(prop in target) ? (data.get(prop) ?? undefined) : Reflect.get(target, prop),
        set: (target, prop, value) =>
            typeof prop === 'string' && !(prop in target)
                ? (data.set(prop, String(value)), true)
                : Reflect.set(target, prop, value),
        has: (target, prop) => (typeof prop === 'string' && data.has(prop)) || Reflect.has(target, prop),
        deleteProperty: (target, prop) =>
            typeof prop === 'string' && data.has(prop) ? data.delete(prop) : Reflect.deleteProperty(target, prop),
    });
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
    const storage = inMemoryStorage();
    for (const target of new Set<object>([globalThis, window])) {
        if (!(target as Record<string, unknown>)[name]) {
            Object.defineProperty(target, name, { configurable: true, writable: true, value: storage });
        }
    }
}

// Không bật vitest globals nên testing-library không tự cleanup → tự gỡ DOM
// sau mỗi test (id trùng giữa các test làm querySelector bắt nhầm).
afterEach(cleanup);
