import { router, usePage } from '@inertiajs/react';
import * as Icon from 'lucide-react';
import { ExternalLinkIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';

import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from '@admin/components/ui/command';
import { navIcon } from '@admin/configs/navConfig';

import { useConsoleLabels } from '../labels';
import type { ConsoleLabelKey, ConsoleNavGroup, SuperAdminPageProps } from '../types';
import { normalizeSearch, useConsoleNavigation } from './navigation';

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
    label: string;
    hint?: string | null;
    icon: keyof typeof Icon;
    badge?: string;
    url: string;
    external: boolean;
};

export const SEARCH_DEBOUNCE_MS = 250;
export const SEARCH_MIN_CHARS = 2;

const RESULT_ICONS: Record<SearchResultType, keyof typeof Icon> = {
    account: 'Building2Icon',
    user: 'UserIcon',
    inbox: 'InboxIcon',
    contact: 'ContactIcon',
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
                label: item.label,
                hint: group.label,
                icon: navIcon(item.key),
                url: item.url,
                external: Boolean(item.external),
            },
            ...(item.children ?? []).map(child => ({
                id: `nav-${item.key}-${child.key}`,
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

// Bảng lệnh Ctrl/Cmd+K: nhảy tới trang (lọc không dấu) và tìm bản ghi trên máy chủ.
export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const label = useConsoleLabels();

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title={label('command_title')}
            description={label('command_placeholder')}
        >
            {open ? <CommandPaletteContent onClose={() => onOpenChange(false)} /> : null}
        </CommandDialog>
    );
}

function CommandPaletteContent({ onClose }: { onClose: () => void }) {
    const label = useConsoleLabels();
    const { groups } = useConsoleNavigation();
    const [query, setQuery] = useState('');
    const remote = useRemoteSearch(query, true);

    const allNavigation = useMemo(() => navigationOptions(groups), [groups]);
    const normalizedQuery = normalizeSearch(query);
    const navigation = normalizedQuery
        ? allNavigation.filter(option => normalizeSearch(`${option.label} ${option.hint ?? ''}`).includes(normalizedQuery))
        : allNavigation;
    const results: PaletteOption[] =
        remote.status === 'ready'
            ? remote.results.map(result => ({
                  id: `result-${result.type}-${result.id}`,
                  label: result.title,
                  hint: result.subtitle,
                  icon: RESULT_ICONS[result.type] ?? 'SearchIcon',
                  badge: RESULT_LABELS[result.type] ? label(RESULT_LABELS[result.type]) : result.type,
                  url: result.url,
                  external: false,
              }))
            : [];

    const select = (option: PaletteOption) => {
        onClose();
        if (option.external) {
            window.open(option.url, '_blank', 'noopener,noreferrer');
        } else {
            router.visit(option.url);
        }
    };

    const trimmed = query.trim();
    const showRemoteHint = trimmed.length > 0 && trimmed.length < SEARCH_MIN_CHARS && remote.status !== 'unavailable';

    const renderOption = (option: PaletteOption, showHintAsShortcut: boolean) => {
        const OptionIcon = Icon[option.icon] as ComponentType;

        return (
            <CommandItem key={option.id} value={option.id} onSelect={() => select(option)}>
                <OptionIcon />
                <span className='flex min-w-0 flex-1 flex-col'>
                    <span className='truncate'>{option.label}</span>
                    {!showHintAsShortcut && option.hint ? (
                        <span className='text-muted-foreground truncate text-xs'>{option.hint}</span>
                    ) : null}
                </span>
                {option.badge ? (
                    <CommandShortcut className='tracking-normal'>{option.badge}</CommandShortcut>
                ) : showHintAsShortcut && option.hint ? (
                    <CommandShortcut className='tracking-normal max-sm:hidden'>{option.hint}</CommandShortcut>
                ) : null}
                {option.external ? <ExternalLinkIcon className='text-muted-foreground size-3.5!' /> : null}
            </CommandItem>
        );
    };

    return (
        <Command shouldFilter={false} loop>
            <CommandInput
                autoFocus
                aria-label={label('command_placeholder')}
                placeholder={label('command_placeholder')}
                value={query}
                onValueChange={setQuery}
            />
            <CommandList className='max-h-[60vh]'>
                {trimmed.length > 0 && remote.status !== 'loading' && remote.status !== 'error' && !showRemoteHint ? (
                    <CommandEmpty>{label('command_empty', { query: trimmed })}</CommandEmpty>
                ) : null}

                {navigation.length > 0 ? (
                    <CommandGroup heading={label('command_navigation')}>
                        {navigation.map(option => renderOption(option, true))}
                    </CommandGroup>
                ) : null}

                {results.length > 0 ? (
                    <CommandGroup heading={label('command_results')}>
                        {results.map(option => renderOption(option, false))}
                    </CommandGroup>
                ) : null}

                {remote.status === 'loading' && results.length === 0 ? (
                    <CommandItem disabled value='__loading'>
                        <Loader2Icon className='animate-spin' />
                        <span role='status'>{label('command_loading')}</span>
                    </CommandItem>
                ) : null}
                {remote.status === 'error' ? (
                    <CommandItem disabled value='__error' className='text-destructive'>
                        <span role='alert'>{label('command_error')}</span>
                    </CommandItem>
                ) : null}
                {showRemoteHint && navigation.length === 0 ? (
                    <CommandItem disabled value='__min_chars'>
                        {label('command_min_chars')}
                    </CommandItem>
                ) : null}
            </CommandList>
        </Command>
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
