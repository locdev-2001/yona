import { useSyncExternalStore } from 'react';

import { IFrameHelper } from '../helpers/iframe';

// Chế độ phóng to panel trên máy tính: SDK nới khung iframe (sự kiện setExpanded),
// widget chuyển bố cục hai cột (danh sách hội thoại + khung chat).
let expanded = false;
const listeners = new Set<() => void>();

export const isExpanded = (): boolean => expanded;

export function setExpanded(next: boolean): void {
    if (expanded === next) return;
    expanded = next;
    IFrameHelper.sendMessage({ event: 'setExpanded', expanded: next });
    listeners.forEach(listener => listener());
}

export const toggleExpanded = (): void => setExpanded(!expanded);

export const useExpanded = (): boolean =>
    useSyncExternalStore(
        listener => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        isExpanded,
        isExpanded,
    );
