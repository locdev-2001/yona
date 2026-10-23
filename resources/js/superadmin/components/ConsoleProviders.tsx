import type { ReactNode } from 'react';
import Providers from '@admin/components/Providers';
import { DesignCopyProvider } from '../design-preview/copy';
import { getLocale } from '../../i18n';
import { locales } from '../../i18n/generated';
export default function ConsoleProviders({ children, sidebarDefaultOpen }: { children: ReactNode; sidebarDefaultOpen?: boolean }) {
    return <DesignCopyProvider value={(locales[getLocale()]?.ADMIN_DESIGN ?? {}) as Record<string, string>}><Providers sidebarDefaultOpen={sidebarDefaultOpen}>{children}</Providers></DesignCopyProvider>;
}
