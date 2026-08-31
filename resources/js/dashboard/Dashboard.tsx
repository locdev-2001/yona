import { useState } from 'react';
import type { ReactNode } from 'react';

import Sidebar from 'dashboard/components-next/sidebar/Sidebar';
import MobileSidebarLauncher from 'dashboard/components-next/sidebar/MobileSidebarLauncher';
import SnackbarContainer from 'v3/components/SnackBar/Container';

// Port từ dashboard/routes/dashboard/Dashboard.vue (shell)
// CommandBar/Copilot/UpgradePage/KeyShortcutModal: EE hoặc vào nhóm sau.
export default function Dashboard({ children }: { children: ReactNode }) {
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
        </div>
    );
}
