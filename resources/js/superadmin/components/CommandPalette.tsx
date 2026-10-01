import { router, usePage } from '@inertiajs/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import type { ConsoleLabelKey, ConsoleNavGroup, SuperAdminPageProps } from '../types';
import { cn } from '../ui/cn';
import { Icon } from '../ui/Icon';
import { Kbd } from '../ui/Kbd';
import { useConsoleLabels } from '../ui/labels';
import { useDismiss, useFocusTrap, useScrollLock } from '../ui/overlay';
import { navIcon, normalizeSearch, useConsoleNavigation } from './navigation';

export type SearchResultType = 'account' | 'user' | 'inbox' | 'contact';

export type SearchResult = {
    type: SearchResultType;
    id: number | string;
    title: string;
    subtitle?: string | null;
    url: string;
};

type RemoteState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; results: SearchResult[] }
    | { status: 'error' }
    | { status: 'unavailable' };

type PaletteOption = {
    id: string;
    section: 'navigation' | 'results';
    label: string;
    hint?: string | null;
    icon: string;
    badge?: string;
    url: string;
    external: boolean;
};

export const SEARCH_DEBOUNCE_MS = 250;
export const SEARCH_MIN_CHARS = 2;

const RESULT_ICONS: Record<SearchResultType, string> = {
    account: 'i-lucide-building-2',
    user: 'i-lucide-user',
    inbox: 'i-lucide-inbox',
    contact: 'i-lucide-contact',
};

const RESULT_LABELS: Record<SearchResultType, ConsoleLabelKey> = {
    account: 'result_account',
    user: 'result_user',
    inbox: 'result_inbox',
    contact: 'result_contact',
};

function navigationOptions(groups: ConsoleNavGroup[]): PaletteOption[] {
    return groups.flatMap(group =>
        group.items.flatMap(item => [
            {
                id: `nav-${item.key}`,
                section: 'navigation' as const,
                label: item.label,
                hint: group.label,
                icon: navIcon(item.key),
                url: item.url,
                external: Boolean(item.external),
            },
            ...(item.children ?? []).map(child => ({
                id: `nav-${item.key}-${child.key}`,
                section: 'navigation' as const,
                label: `${item.label} › ${child.label}`,
                hint: group.label,
                icon: navIcon(item.key),
                url: child.url,
                external: false,
            })),
        ]),
    );
}

// Tìm trên máy chủ (tài khoản, người dùng, hộp thư, liên hệ). Endpoint chưa có
// (404) thì coi như "không hỗ trợ" và chỉ còn tìm trang, không báo lỗi.
function useRemoteSearch(query: string, enabled: boolean): RemoteState {
    const searchUrl = usePage<SuperAdminPageProps>().props.superAdmin?.searchUrl ?? '/admin/api/search';
    const [state, setState] = useState<RemoteState>({ status: 'idle' });
    const unavailableRef = useRef(false);
    const trimmed = query.trim();

    useEffect(() => {
        if (!enabled || unavailableRef.current) {
            if (unavailableRef.current) setState({ status: 'unavailable' });
            return;
        }
        if (trimmed.length < SEARCH_MIN_CHARS) {
            setState({ status: 'idle' });
            return;
        }

        setState({ status: 'loading' });
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            fetch(`${searchUrl}?q=${encodeURIComponent(trimmed)}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
                signal: controller.signal,
            })
                .then(async response => {
                    if (response.status === 404 || response.status === 405) {
                        unavailableRef.current = true;
                        setState({ status: 'unavailable' });
                        return;
                    }
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const payload = (await response.json()) as { data?: SearchResult[] };
                    setState({ status: 'ready', results: Array.isArray(payload.data) ? payload.data : [] });
                })
                .catch(error => {
                    if ((error as Error).name !== 'AbortError') setState({ status: 'error' });
                });
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [trimmed, enabled, searchUrl]);

    return state;
}

export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    if (!open) return null;

    return <CommandPalettePanel onClose={() => onOpenChange(false)} />;
}

function CommandPalettePanel({ onClose }: { onClose: () => void }) {
    const label = useConsoleLabels();
    const { groups } = useConsoleNavigation();
    const panelRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const listboxId = useId();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const remote = useRemoteSearch(query, true);

    useDismiss(true, onClose, panelRef);
    useFocusTrap(true, panelRef);
    useScrollLock(true);

    const allNavigation = useMemo(() => navigationOptions(groups), [groups]);
    const normalizedQuery = normalizeSearch(query);
    const navigation = normalizedQuery
        ? allNavigation.filter(option =>
              normalizeSearch(`${option.label} ${option.hint ?? ''}`).includes(normalizedQuery),
          )
        : allNavigation;
    const results: PaletteOption[] =
        remote.status === 'ready'
            ? remote.results.map(result => ({
                  id: `result-${result.type}-${result.id}`,
                  section: 'results',
                  label: result.title,
                  hint: result.subtitle,
                  icon: RESULT_ICONS[result.type] ?? 'i-lucide-search',
                  badge: RESULT_LABELS[result.type] ? label(RESULT_LABELS[result.type]) : result.type,
                  url: result.url,
                  external: false,
              }))
            : [];
    const options = [...navigation, ...results];
    const boundedIndex = options.length === 0 ? -1 : Math.min(activeIndex, options.length - 1);
    const activeOption = boundedIndex >= 0 ? options[boundedIndex] : null;

    useEffect(() => setActiveIndex(0), [normalizedQuery]);

    useEffect(() => {
        if (!activeOption) return;
        const element = listRef.current?.querySelector<HTMLElement>(`[data-option-id="${activeOption.id}"]`);
        element?.scrollIntoView?.({ block: 'nearest' });
    }, [activeOption]);

    const select = (option: PaletteOption) => {
        onClose();
        if (option.external) {
            window.open(option.url, '_blank', 'noopener,noreferrer');
        } else {
            router.visit(option.url);
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (options.length === 0) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((boundedIndex + 1) % options.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((boundedIndex - 1 + options.length) % options.length);
        } else if (event.key === 'Home' && event.ctrlKey) {
            event.preventDefault();
            setActiveIndex(0);
        } else if (event.key === 'End' && event.ctrlKey) {
            event.preventDefault();
            setActiveIndex(options.length - 1);
        } else if (event.key === 'Enter' && activeOption) {
            event.preventDefault();
            select(activeOption);
        }
    };

    const renderOption = (option: PaletteOption) => {
        const active = option.id === activeOption?.id;

        return (
            <div
                key={option.id}
                id={`${listboxId}-${option.id}`}
                data-option-id={option.id}
                role="option"
                aria-selected={active}
                className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm',
                    active ? 'bg-console-accent text-console-foreground' : 'text-console-foreground/90',
                )}
                onMouseMove={() => setActiveIndex(options.indexOf(option))}
                onMouseDown={event => event.preventDefault()}
                onClick={() => select(option)}
            >
                <Icon name={option.icon} className="text-console-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.hint && option.section === 'results' ? (
                        <span className="truncate text-xs text-console-muted-foreground">{option.hint}</span>
                    ) : null}
                </span>
                {option.badge ? (
                    <span className="shrink-0 text-xs text-console-muted-foreground">{option.badge}</span>
                ) : option.section === 'navigation' && option.hint ? (
                    <span className="hidden shrink-0 text-xs text-console-muted-foreground sm:inline">{option.hint}</span>
                ) : null}
                {option.external ? <Icon name="i-lucide-external-link" className="size-3.5 text-console-muted-foreground" /> : null}
            </div>
        );
    };

    const hasQuery = query.trim().length > 0;
    const showRemoteHint = hasQuery && query.trim().length < SEARCH_MIN_CHARS && remote.status !== 'unavailable';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
            <div aria-hidden="true" className="absolute inset-0 bg-black/40" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label('command_title')}
                className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-console-border bg-console-card text-console-foreground shadow-2xl"
            >
                <div className="flex items-center gap-2 border-b border-console-border px-3">
                    <Icon name="i-lucide-search" className="text-console-muted-foreground" />
                    <input
                        data-autofocus
                        type="text"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={activeOption ? `${listboxId}-${activeOption.id}` : undefined}
                        aria-label={label('command_placeholder')}
                        placeholder={label('command_placeholder')}
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-console-muted-foreground"
                    />
                    {remote.status === 'loading' ? (
                        <Icon name="i-lucide-loader-circle" className="animate-spin text-console-muted-foreground" />
                    ) : null}
                </div>

                <div ref={listRef} id={listboxId} role="listbox" aria-label={label('command_title')} className="min-h-0 flex-1 overflow-y-auto p-2">
                    {navigation.length > 0 ? (
                        <div role="group" aria-label={label('command_navigation')}>
                            <p className="px-2 pb-1 pt-1 text-xs font-medium text-console-muted-foreground">
                                {label('command_navigation')}
                            </p>
                            {navigation.map(renderOption)}
                        </div>
                    ) : null}

                    {results.length > 0 ? (
                        <div role="group" aria-label={label('command_results')} className={cn(navigation.length > 0 && 'mt-2')}>
                            <p className="px-2 pb-1 pt-1 text-xs font-medium text-console-muted-foreground">
                                {label('command_results')}
                            </p>
                            {results.map(renderOption)}
                        </div>
                    ) : null}

                    {remote.status === 'loading' && results.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-console-muted-foreground" role="status">
                            {label('command_loading')}
                        </p>
                    ) : null}
                    {remote.status === 'error' ? (
                        <p className="px-2 py-3 text-sm text-console-destructive-foreground" role="alert">
                            {label('command_error')}
                        </p>
                    ) : null}
                    {showRemoteHint && navigation.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-console-muted-foreground">{label('command_min_chars')}</p>
                    ) : null}
                    {hasQuery && options.length === 0 && remote.status !== 'loading' && remote.status !== 'error' && !showRemoteHint ? (
                        <p className="px-2 py-6 text-center text-sm text-console-muted-foreground" role="status">
                            {label('command_empty', { query: query.trim() })}
                        </p>
                    ) : null}
                </div>

                <div className="hidden items-center gap-4 border-t border-console-border px-3 py-2 text-xs text-console-muted-foreground sm:flex">
                    <span className="flex items-center gap-1">
                        <Kbd>↑</Kbd>
                        <Kbd>↓</Kbd>
                        {label('command_footer_navigate')}
                    </span>
                    <span className="flex items-center gap-1">
                        <Kbd>↵</Kbd>
                        {label('command_footer_select')}
                    </span>
                    <span className="flex items-center gap-1">
                        <Kbd>Esc</Kbd>
                        {label('command_footer_close')}
                    </span>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// Ctrl/Cmd+K mở hoặc đóng bảng lệnh ở mọi trang của console.
export function useCommandPaletteShortcut(toggle: () => void): void {
    const toggleRef = useRef(toggle);
    toggleRef.current = toggle;

    useEffect(() => {
        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                toggleRef.current();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);
}
