import type { ReactNode } from 'react';
import ConsoleProviders from './ConsoleProviders';
import './console-shell.css';
import '../resource/resources.css';
export default function ConsoleAuthLayout({ children }: { children: ReactNode }) {
    return <ConsoleProviders><div className="admin-preview admin-console-auth">{children}</div></ConsoleProviders>;
}
