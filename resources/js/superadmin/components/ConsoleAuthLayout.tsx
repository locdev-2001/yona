import type { ReactNode } from 'react';
import { useTheme } from '@admin/components/ThemeProvider';
import ConsoleProviders from './ConsoleProviders';
import './console-shell.css';
import '../resource/resources.css';
function ConsoleAuthSurface({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    return <div className="admin-preview admin-console-auth" data-theme={theme}>{children}</div>;
}
export default function ConsoleAuthLayout({ children }: { children: ReactNode }) {
    return <ConsoleProviders><ConsoleAuthSurface>{children}</ConsoleAuthSurface></ConsoleProviders>;
}
