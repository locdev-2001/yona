import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import Providers from '@admin/components/Providers';
import Footer from '@admin/components/layout/Footer';
import Header from '@admin/components/layout/Header';
import ScrollToTop from '@admin/components/layout/ScrollToTop';
import Sidebar from '@admin/components/layout/Sidebar';
import { SidebarInset } from '@admin/components/ui/sidebar';
import { Toaster } from '@admin/components/ui/sonner';

import { useConsoleLabels } from '../labels';
import type { SuperAdminPageProps } from '../types';
import CommandPalette, { useCommandPaletteShortcut } from './CommandPalette';

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
    const togglePalette = useCallback(() => setPaletteOpen(value => !value), []);

    useCommandPaletteShortcut(togglePalette);
    useFlashToasts();

    return (
        <>
            <div className="flex h-full w-full min-w-0">
                <Sidebar />
                <SidebarInset className="flex flex-1 flex-col">
                    <Header onOpenSearch={() => setPaletteOpen(true)} />
                    <main className="mx-auto size-full max-w-360 flex-1 px-4 py-6 sm:px-6">{children}</main>
                    <Toaster />
                    <Footer />
                </SidebarInset>
            </div>
            <ScrollToTop />
            <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        </>
    );
}

// Khung console: thanh bên theo vùng chức năng (thu về dải icon trên máy tính, ngăn
// trượt trên điện thoại), thanh trên có ô tìm kiếm Ctrl/Cmd+K và menu người dùng.
export default function Layout({ children }: { children: ReactNode }) {
    const [sidebarDefaultOpen] = useState(readSidebarOpen);

    return (
        <Providers sidebarDefaultOpen={sidebarDefaultOpen}>
            <ConsoleShell>{children}</ConsoleShell>
        </Providers>
    );
}
