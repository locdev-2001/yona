import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { applyFontSizeToDOM } from 'dashboard/composables/useFontSize';
import Sidebar from 'dashboard/components-next/sidebar/Sidebar';
import MobileSidebarLauncher from 'dashboard/components-next/sidebar/MobileSidebarLauncher';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import RealtimeProvider from 'dashboard/realtime/RealtimeProvider';
import type { DashboardPageProps } from './types';

// Port từ dashboard/routes/dashboard/Dashboard.vue (shell)
// CommandBar/Copilot/UpgradePage/KeyShortcutModal: EE hoặc vào nhóm sau.
export default function Dashboard({ children }: { children: ReactNode }) {
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const { auth } = usePage<DashboardPageProps>().props;
    const fontSize = auth.user?.ui_settings?.font_size as string | undefined;

    useEffect(() => {
        applyFontSizeToDOM(fontSize);
    }, [fontSize]);

    return (
        <div className="flex flex-grow overflow-hidden text-n-slate-12 h-screen w-full">
            <Sidebar
                isMobileSidebarOpen={isMobileSidebarOpen}
                onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
            />
            <main className="flex flex-1 h-full w-full min-h-0 px-0 overflow-hidden bg-n-surface-1">
                {children}
                <MobileSidebarLauncher
                    isMobileSidebarOpen={isMobileSidebarOpen}
                    onToggle={() => setMobileSidebarOpen(open => !open)}
                />
            </main>
            <SnackbarContainer />
            <RealtimeProvider />
        </div>
    );
}
