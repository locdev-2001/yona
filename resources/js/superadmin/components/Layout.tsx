import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import IconSprite from './IconSprite';
import type { SuperAdminPageProps } from '../types';

const RESOURCE_ICONS: Record<string, string> = {
    accounts: 'icon-building-4-line',
    users: 'icon-user-follow-line',
    agent_bots: 'icon-robot-line',
    platform_apps: 'icon-apps-2-line',
};

const NAV_ITEM_CLASS =
    '-ml-1 focus:outline-none cursor-pointer flex items-center px-2 py-1.5 text-slate-800 cursor-pointer hover:text-woot-500 hover:bg-slate-25 rounded-lg';

function NavItem({
    icon,
    url,
    label,
    active = false,
}: {
    icon: string;
    url: string;
    label: string;
    active?: boolean;
}) {
    return (
        <li className="px-4 mb-1">
            <a
                className={`${active ? 'text-woot-500 bg-slate-25' : 'text-slate-800'} ${NAV_ITEM_CLASS}`}
                href={url}
            >
                <svg width="16" height="16">
                    <use xlinkHref={`#${icon}`} />
                </svg>
                <span className="ml-2 text-sm">{label}</span>
            </a>
        </li>
    );
}

export default function Layout({ children }: { children: ReactNode }) {
    const { superAdmin, flash } = usePage<SuperAdminPageProps>().props;
    const currentPath = superAdmin.currentPath;
    const settingsOpen = currentPath.startsWith('/super_admin/settings') ||
        currentPath.startsWith('/super_admin/app_config');

    return (
        <div className="flex w-full h-full">
            <IconSprite />
            <div
                className="border-slate-100 border-r w-56 flex-shrink-0 justify-between h-full flex flex-col"
                role="navigation"
            >
                <div>
                    <div className="flex mx-4 mb-4 border-slate-100 border-b py-6">
                        <Link href="/super_admin">
                            <img
                                alt="Admin Dashboard"
                                className="h-10"
                                src={superAdmin.logoThumbnail}
                            />
                        </Link>
                        <div className="flex flex-col ml-3">
                            <div className="text-sm">
                                {superAdmin.installationName} {superAdmin.version}
                            </div>
                            <div className="text-xs text-slate-700 mt-0.5">
                                Super Admin Console
                            </div>
                        </div>
                    </div>

                    <ul className="my-4">
                        <NavItem
                            icon="icon-grid-line"
                            url="/super_admin"
                            label="Dashboard"
                            active={currentPath === '/super_admin'}
                        />
                        {superAdmin.navigation.map(item => (
                            <NavItem
                                key={item.resource}
                                icon={RESOURCE_ICONS[item.resource]}
                                url={item.url}
                                label={item.label}
                                active={currentPath.startsWith(item.url)}
                            />
                        ))}
                        <li className="px-4 mb-1">
                            <details className="group" open={settingsOpen}>
                                <summary className="-ml-1 flex items-center px-2 py-1.5 cursor-pointer rounded-lg text-slate-800 hover:text-woot-500 hover:bg-slate-25 list-none">
                                    <a
                                        className="flex items-center flex-1"
                                        href="/super_admin/settings"
                                    >
                                        <svg width="16" height="16">
                                            <use xlinkHref="#icon-settings-2-line" />
                                        </svg>
                                        <span className="ml-2 text-sm">Settings</span>
                                    </a>
                                    <svg
                                        className="ml-auto w-4 h-4 transition-transform duration-200 group-open:rotate-180"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </summary>
                                <ul className="ml-4 mt-1">
                                    {superAdmin.settingsPages.map(page => (
                                        <li className="px-4 mb-1" key={page.key}>
                                            <a
                                                className="text-slate-800 -ml-1 flex items-center px-2 py-1.5 hover:text-woot-500 hover:bg-slate-25 rounded-lg"
                                                href={page.url}
                                            >
                                                <span className="ml-2 text-sm">
                                                    {page.label}
                                                </span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </li>
                    </ul>
                </div>
                <div>
                    <ul className="my-4">
                        <NavItem
                            icon="icon-health-book-line"
                            url="/super_admin/instance_status"
                            label="Instance Health"
                            active={currentPath === '/super_admin/instance_status'}
                        />
                        <NavItem icon="icon-dashboard-line" url="/" label="Agent Dashboard" />
                        <NavItem
                            icon="icon-logout-circle-r-line"
                            url="/super_admin/logout"
                            label="Logout"
                        />
                    </ul>
                </div>
            </div>
            <main className="w-full overflow-auto" role="main">
                {flash?.notice ? <div className="flash-notice">{flash.notice}</div> : null}
                {flash?.error ? <div className="flash-error">{flash.error}</div> : null}
                {children}
            </main>
        </div>
    );
}
