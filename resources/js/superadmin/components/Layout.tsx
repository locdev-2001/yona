import { DesignCopyProvider } from '../design-preview/copy';
import { locales } from '../../i18n/generated';
import { getLocale } from '../../i18n';
import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import Providers from '@admin/components/Providers';
import useThemeConfig from '@admin/configs/themeConfig';
import { useTheme } from '@admin/components/ThemeProvider';
import ConsoleHeader from './ConsoleHeader';
import ScrollToTop from '@admin/components/layout/ScrollToTop';
import ConsoleNavigation from './ConsoleNavigation';
import { Toaster } from '@admin/components/ui/sonner';

import { useConsoleLabels } from '../labels';
import type { SuperAdminPageProps } from '../types';
import CommandPalette, { useCommandPaletteShortcut } from './CommandPalette';
import './console-shell.css';

// Thanh bên tự ghi cookie `sidebar_state` khi thu gọn/mở; đọc lại để giữ trạng thái giữa các lần tải.
function readSidebarOpen(): boolean {
    try {
        return !/(?:^|;\s*)sidebar_state=false(?:;|$)/.test(document.cookie);
    } catch {
        return true;
    }
}

// Thông báo flash từ máy chủ hiện thành toast, mỗi phản hồi một lần.
function useFlashToasts(): void {
    const { flash } = usePage<SuperAdminPageProps>().props;
    const label = useConsoleLabels();

    useEffect(() => {
        if (flash?.notice) toast.success(flash.notice);
        if (flash?.alert) toast.warning(flash.alert);
        if (flash?.error) toast.error(label('flash_error'), { description: flash.error });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash]);
}

function ConsoleShell({ children }: { children: ReactNode }) {
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { theme } = useTheme();
    const { templateName, subtitle, version } = useThemeConfig();
    const togglePalette = useCallback(() => {
        setSearchQuery('');
        setPaletteOpen(value => !value);
    }, []);

    useCommandPaletteShortcut(togglePalette);
    useFlashToasts();

    return (
        <>
            <div className="admin-preview admin-console-shell" data-theme={theme}>
                <ConsoleNavigation />
                <div className="preview-workspace">
                    <ConsoleHeader onOpenSearch={(query = '') => { setSearchQuery(query); setPaletteOpen(true); }} />
                    <main className="admin-console-content">{children}</main>
                    <footer className="admin-console-footer"><span>©{new Date().getFullYear()} {templateName} · {subtitle}</span><span>{version}</span></footer>
                    <Toaster />
                </div>
            </div>
            <ScrollToTop />
            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} initialQuery={searchQuery} />
        </>
    );
}

// Khung console: thanh bên theo vùng chức năng (thu về dải icon trên máy tính, ngăn
// trượt trên điện thoại), thanh trên có tìm kiếm Ctrl/Cmd+K; tài khoản ở footer sidebar.
export default function Layout({ children }: { children: ReactNode }) {
    const [sidebarDefaultOpen] = useState(readSidebarOpen);

    return (
        <DesignCopyProvider value={(locales[getLocale()]?.ADMIN_DESIGN ?? {}) as Record<string, string>}><Providers sidebarDefaultOpen={sidebarDefaultOpen}>
            <ConsoleShell>{children}</ConsoleShell>
        </Providers></DesignCopyProvider>
    );
}
