import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Icon from 'dashboard/components-next/icon/Icon';
import { DropdownInlineList, DropdownItem } from 'dashboard/components-next/dropdown-menu/base';
import SidebarProfileMenuStatus from 'dashboard/components-next/sidebar/SidebarProfileMenuStatus';
import KeyShortcutModal from 'dashboard/commands/KeyShortcutModal';
import SearchField from 'dashboard/components-next/search-field/SearchField';
import Kbd from 'dashboard/components-next/kbd/Kbd';
import { logout } from 'dashboard/helper/logout';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { useCurrentUserAvailability } from 'dashboard/realtime/hooks';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { DashboardPageProps } from '../../types';
import { readLastAppUrl, settingsHomeUrl, useSettingsPages } from './settingsPages';

interface NavLink {
    name: string;
    label: string;
    icon?: string;
    to: string;
}

// Cú bấm thứ hai của một lần bấm đúp bánh răng rơi xuống nền mờ: bỏ qua trong khoảng này.
const BACKDROP_CLOSE_GRACE_MS = 600;

const isTypingTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

// Màn Cài đặt: cửa sổ nổi giữa màn trên máy tính (bấm nền mờ để đóng), toàn màn trên
// điện thoại. Cột trái gồm hồ sơ, trạng thái và danh mục trang cài đặt; bên phải là
// trang đang mở. ✕ hoặc ESC quay về trang trước khi vào Cài đặt. Giao diện, ngôn ngữ,
// cỡ chữ nằm ở trang Hồ sơ của tôi nên không lặp lại ở cột trái.
export default function SettingsShell({ children }: { children: ReactNode }) {
    const page = usePage<DashboardPageProps>();
    const { auth, currentAccount } = page.props;
    const currentUrl = page.url;
    const user = auth.user!;
    const accountId = currentAccount.id;
    const availability = useCurrentUserAvailability();
    const displayName = user.display_name || user.name;
    const settingsPages = useSettingsPages();
    const [query, setQuery] = useState('');
    const [isNavOpen, setNavOpen] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const openedAt = useRef(Date.now());

    const groups: { title: string; links: NavLink[] }[] = [
        {
            title: t('SIDEBAR_ITEMS.SETTINGS_SCREEN.ACCOUNT_GROUP'),
            links: [
                {
                    name: 'my-profile',
                    label: t('SIDEBAR_ITEMS.SETTINGS_SCREEN.MY_PROFILE'),
                    icon: 'i-lucide-user-round',
                    to: settingsHomeUrl(accountId),
                },
            ],
        },
        {
            title: t('SIDEBAR_ITEMS.SETTINGS_SCREEN.INBOX_GROUP'),
            links: settingsPages.map(page => ({
                name: page.name,
                label: page.label,
                icon: typeof page.icon === 'string' ? page.icon : undefined,
                to: page.to!,
            })),
        },
    ];

    const normalizedQuery = query.trim().toLocaleLowerCase();
    const visibleGroups = groups
        .map(group => ({
            ...group,
            links: group.links.filter(link => link.label.toLocaleLowerCase().includes(normalizedQuery)),
        }))
        .filter(group => group.links.length > 0);

    const path = currentUrl.split('?')[0];
    const isCurrent = (link: NavLink) => {
        const linkPath = link.to.split('?')[0];
        const section = linkPath.replace(/\/(list|new)$/, '');
        return path === linkPath || path.startsWith(`${section}/`) || path === section;
    };
    const currentLink = groups.flatMap(group => group.links).find(isCurrent);

    const close = () => router.visit(readLastAppUrl() ?? accountScopedUrl(accountId, 'dashboard'));

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || isTypingTarget(event.target)) return;
            if (document.querySelector('dialog[open]')) return;
            close();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => setNavOpen(false), [currentUrl]);

    return (
        <div
            className="fixed inset-0 z-40 flex md:items-center md:justify-center md:p-8 md:bg-n-alpha-black1 md:backdrop-blur-[2px]"
            onClick={event => {
                if (event.target !== event.currentTarget) return;
                if (Date.now() - openedAt.current < BACKDROP_CLOSE_GRACE_MS) return;
                close();
            }}
        >
        <div
            role="dialog"
            aria-modal="true"
            aria-label={t('SIDEBAR_ITEMS.SETTINGS_SCREEN.TITLE')}
            className="flex w-full h-full min-w-0 overflow-hidden bg-n-surface-1 md:max-w-6xl md:max-h-[860px] md:rounded-2xl md:border md:border-n-weak md:shadow-2xl"
        >
            <aside
                aria-label={t('SIDEBAR_ITEMS.SETTINGS_SCREEN.MENU')}
                className={`flex-col w-72 shrink-0 gap-3 p-3 overflow-y-auto border-e border-n-weak bg-n-surface-sidebar max-md:fixed max-md:inset-0 max-md:z-50 max-md:w-full ${
                    isNavOpen ? 'flex' : 'hidden md:flex'
                }`}
            >
                <div className="flex items-center gap-3 px-1 pt-1">
                    <Avatar seed={avatarSeed('user', user.id)} size={44} src={user.avatar_url} name={displayName} status={availability} />
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-semibold truncate text-n-slate-12">{displayName}</span>
                        <Link
                            href={settingsHomeUrl(accountId)}
                            className="flex items-center gap-1 text-xs text-n-slate-11 hover:text-n-slate-12"
                        >
                            {t('SIDEBAR_ITEMS.SETTINGS_SCREEN.EDIT_PROFILE')}
                            <Icon icon="i-lucide-pencil" className="size-3" />
                        </Link>
                    </div>
                    <button
                        type="button"
                        className="md:hidden grid place-content-center size-8 rounded-lg text-n-slate-11 hover:bg-n-alpha-2"
                        aria-label={t('SIDEBAR_ITEMS.SETTINGS_SCREEN.CLOSE')}
                        onClick={() => setNavOpen(false)}
                    >
                        <Icon icon="i-lucide-x" className="size-4" />
                    </button>
                </div>

                <SearchField
                    value={query}
                    placeholder={t('SIDEBAR_ITEMS.SETTINGS_SCREEN.SEARCH')}
                    className="shrink-0"
                    onChange={setQuery}
                />

                {normalizedQuery ? null : (
                    <DropdownInlineList className="!gap-0 rounded-xl border border-n-weak bg-n-surface-1 p-1">
                        <SidebarProfileMenuStatus />
                    </DropdownInlineList>
                )}

                <nav className="flex flex-col gap-3">
                    {visibleGroups.map(group => (
                        <div key={group.title} className="flex flex-col gap-0.5">
                            <h3 className="px-2.5 pb-1 m-0 text-xs font-medium text-n-slate-11">{group.title}</h3>
                            {group.links.map(link => {
                                const isActive = link === currentLink;
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.to}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm transition-colors ${
                                            isActive
                                                ? 'bg-n-alpha-3 text-n-slate-12 font-medium'
                                                : 'text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12'
                                        }`}
                                    >
                                        {link.icon ? <Icon icon={link.icon} className="size-4 shrink-0" /> : null}
                                        <span className="truncate">{link.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                    {visibleGroups.length === 0 ? (
                        <p className="px-2.5 m-0 text-sm text-n-slate-11">{t('SIDEBAR_ITEMS.SETTINGS_SCREEN.NO_MATCH')}</p>
                    ) : null}
                </nav>

                {normalizedQuery ? null : (
                    <DropdownInlineList className="pt-2 border-t border-n-weak">
                        <DropdownItem
                            label={t('SIDEBAR_ITEMS.KEYBOARD_SHORTCUTS')}
                            icon="i-lucide-keyboard"
                            onClick={() => setShowShortcuts(true)}
                        />
                        {user.type === 'SuperAdmin' ? (
                            <DropdownItem
                                label={t('SIDEBAR_ITEMS.SUPER_ADMIN_CONSOLE')}
                                icon="i-lucide-castle"
                                link="/admin"
                                nativeLink
                                target="_blank"
                            />
                        ) : null}
                        <DropdownItem
                            label={t('SIDEBAR_ITEMS.LOGOUT')}
                            icon="i-lucide-power"
                            className="!text-n-ruby-11"
                            onClick={logout}
                        />
                    </DropdownInlineList>
                )}
            </aside>

            <section className="flex flex-col flex-1 min-w-0 h-full">
                <header className="flex items-center gap-2 h-12 px-3 shrink-0 border-b border-n-weak">
                    <button
                        type="button"
                        className="md:hidden grid place-content-center size-8 rounded-lg text-n-slate-11 hover:bg-n-alpha-2"
                        aria-label={t('SIDEBAR_ITEMS.SETTINGS_SCREEN.MENU')}
                        onClick={() => setNavOpen(true)}
                    >
                        <Icon icon="i-lucide-menu" className="size-4" />
                    </button>
                    <h1 className="flex-1 m-0 text-sm font-semibold truncate text-n-slate-12">
                        {currentLink?.label ?? t('SIDEBAR_ITEMS.SETTINGS_SCREEN.TITLE')}
                    </h1>
                    <button
                        type="button"
                        className="flex items-center gap-1.5 h-8 ps-2 pe-1.5 max-md:pe-2 rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12 transition-colors"
                        aria-label={t('SIDEBAR_ITEMS.SETTINGS_SCREEN.CLOSE')}
                        title={t('SIDEBAR_ITEMS.SETTINGS_SCREEN.CLOSE')}
                        onClick={close}
                    >
                        <Icon icon="i-lucide-x" className="size-4" />
                        <Kbd keyName="esc" className="max-md:hidden" />
                    </button>
                </header>
                <div className="flex flex-1 min-h-0 overflow-hidden">{children}</div>
            </section>
            {createPortal(<KeyShortcutModal show={showShortcuts} onClose={() => setShowShortcuts(false)} />, document.body)}
        </div>
        </div>
    );
}
