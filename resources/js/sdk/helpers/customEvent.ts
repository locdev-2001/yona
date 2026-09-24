import { LEGACY_EVENT_PREFIX } from '../../shared/legacyContracts';
import { SDK_EVENT_PREFIX } from '../constants/sdkEvents';

const SDK_EVENT_PREFIXES = [SDK_EVENT_PREFIX, LEGACY_EVENT_PREFIX];

export const createEvent = ({ eventName, data = null }: { eventName: string; data?: unknown }): Event => {
    if (typeof window.CustomEvent === 'function') {
        return new CustomEvent(eventName, { detail: data });
    }

    const event = document.createEvent('CustomEvent');
    event.initCustomEvent(eventName, false, false, data);

    return event;
};

export const dispatchWindowEvent = ({ eventName, data }: { eventName: string; data?: unknown }): void => {
    window.dispatchEvent(createEvent({ eventName, data }));
};

// Bắn tên mới trước rồi tên cũ, cùng `detail`: trang khách nghe tên nào cũng nhận.
export const dispatchSdkEvent = (key: string, data?: unknown): void => {
    SDK_EVENT_PREFIXES.forEach(prefix => dispatchWindowEvent({ eventName: `${prefix}:${key}`, data }));
};

// Iframe có thể gửi khoá trần hoặc khoá đã mang tiền tố (iframe nói giao thức đời trước).
export const toSdkEventKey = (identifier: string): string => {
    const prefix = SDK_EVENT_PREFIXES.find(candidate => identifier.startsWith(`${candidate}:`));

    return prefix ? identifier.slice(prefix.length + 1) : identifier;
};
