import { usePage } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import type { SuperAdminPageProps } from '../types';
import { Alert } from '../ui/Alert';
import { cn } from '../ui/cn';
import { useConsoleLabels } from '../ui/labels';
import { Sheet } from '../ui/Sheet';
import CommandPalette, { useCommandPaletteShortcut } from './CommandPalette';
import { SidebarContent } from './Sidebar';
import Topbar from './Topbar';

const COLLAPSED_STORAGE_KEY = 'yona.admin.sidebarCollapsed';

function readCollapsed(): boolean {
    try {
        return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function writeCollapsed(collapsed: boolean): void {
    try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
        // Trình duyệt chặn lưu trữ: thanh bên vẫn chạy, chỉ không nhớ trạng thái.
    }
}

function FlashMessages() {
    const { flash } = usePage<SuperAdminPageProps>().props;
    const label = useConsoleLabels();

    if (!flash?.notice && !flash?.error && !flash?.alert) return null;

    return (
        <div className="flex flex-col gap-2">
            {flash.notice ? <Alert tone="success">{flash.notice}</Alert> : null}
            {flash.alert ? <Alert tone="warning">{flash.alert}</Alert> : null}
            {flash.error ? (
                <Alert tone="destructive" title={label('flash_error')}>
                    {flash.error}
                </Alert>
            ) : null}
        </div>
    );
}

// Khung console: thanh bên theo vùng chức năng (thu gọn được trên máy tính, thành
// ngăn trượt trên điện thoại), thanh trên có ô tìm kiếm Ctrl/Cmd+K và menu người dùng.
export default function Layout({ children }: { children: ReactNode }) {
    const label = useConsoleLabels();
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);

    const toggleCollapsed = () => {
        setCollapsed(!collapsed);
        writeCollapsed(!collapsed);
    };
    const togglePalette = useCallback(() => setPaletteOpen(value => !value), []);

    useCommandPaletteShortcut(togglePalette);

    return (
        <div className="flex min-h-dvh w-full bg-console-background text-console-foreground">
            <aside
                className={cn(
                    'sticky top-0 hidden h-dvh shrink-0 border-r border-console-border bg-console-sidebar transition-[width] duration-200 md:block',
                    collapsed ? 'w-14' : 'w-64',
                )}
            >
                <SidebarContent collapsed={collapsed} />
            </aside>

            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} label={label('navigation')}>
                <SidebarContent onNavigate={() => setMobileNavOpen(false)} onClose={() => setMobileNavOpen(false)} />
            </Sheet>

            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar
                    collapsed={collapsed}
                    onToggleCollapsed={toggleCollapsed}
                    onOpenMobileNav={() => setMobileNavOpen(true)}
                    onOpenSearch={() => setPaletteOpen(true)}
                />
                <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
                    <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
                        <FlashMessages />
                        {children}
                    </div>
                </main>
            </div>

            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </div>
    );
}
