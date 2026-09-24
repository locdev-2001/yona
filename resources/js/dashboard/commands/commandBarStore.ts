import { useSyncExternalStore } from 'react';

import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';

// Gom các composable phím tắt (useConversationHotKeys, useGoToCommandHotKeys…) vào một store:
// mỗi nguồn đăng ký danh sách action của mình; CommandBar (mount ở Dashboard, ngoài
// ConversationProvider) gộp lại. B5 chỉ có nguồn conversation; B10 thêm nguồn = thêm setCommandBarActions.
type Listener = () => void;

const sources = new Map<string, CommandBarAction[]>();
const listeners = new Set<Listener>();
let snapshot: CommandBarAction[] = [];

function notify() {
    snapshot = Array.from(sources.values()).flat();
    listeners.forEach(listener => listener());
}

export function setCommandBarActions(source: string, actions: CommandBarAction[]): void {
    sources.set(source, actions);
    notify();
}

export function clearCommandBarActions(source: string): void {
    if (sources.delete(source)) notify();
}

function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getCommandBarActions(): CommandBarAction[] {
    return snapshot;
}

export function useCommandBarActions(): CommandBarAction[] {
    return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export interface NinjaKeysElement extends HTMLElement {
    data: CommandBarAction[];
    placeholder: string;
    open(options?: { parent?: string }): void;
    close(): void;
}

// openSnoozeModal gốc: document.querySelector('ninja-keys').open({ parent })
export function openCommandBar(options?: { parent?: string }): void {
    document.querySelector<NinjaKeysElement>('ninja-keys')?.open(options);
}
