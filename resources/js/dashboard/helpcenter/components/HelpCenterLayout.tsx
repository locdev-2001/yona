import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import PaginationFooter from 'dashboard/components-next/pagination/PaginationFooter';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useClickAway } from 'dashboard/composables/useClickAway';
import CreatePortalDialog from './CreatePortalDialog';
import PortalSwitcher from './PortalSwitcher';
import { useHelpCenterState } from '../store';

// Port từ components-next/HelpCenter/HelpCenterLayout.vue.
interface HelpCenterLayoutProps {
    currentPage?: number;
    totalItems?: number;
    itemsPerPage?: number;
    showHeaderTitle?: boolean;
    showPaginationFooter?: boolean;
    breadcrumbLabel?: string;
    portalSlug?: string;
    titleActions?: ReactNode;
    headerActions?: ReactNode;
    content?: ReactNode;
    children?: ReactNode;
    onPageChange?: (page: number) => void;
}

export default function HelpCenterLayout({
    currentPage = 1,
    totalItems = 100,
    itemsPerPage = 25,
    showHeaderTitle = true,
    showPaginationFooter = true,
    breadcrumbLabel = '',
    portalSlug,
    titleActions,
    headerActions,
    content,
    children,
    onPageChange,
}: HelpCenterLayoutProps) {
    const [showPortalSwitcher, setShowPortalSwitcher] = useState(false);
    const createPortalDialogRef = useRef<DialogHandle>(null);
    const switcherRef = useRef<HTMLDivElement>(null);
    useClickAway(switcherRef, () => setShowPortalSwitcher(false), showPortalSwitcher);

    const { portals } = useHelpCenterState();
    const activePortalName = portals.find(portal => portal.slug === portalSlug)?.name;

    return (
        <section className="flex flex-col w-full h-full overflow-hidden bg-n-surface-1">
            <header className="sticky top-0 z-10 px-6 pb-3">
                <div className="w-full max-w-5xl mx-auto">
                    {showHeaderTitle ? (
                        <div className="flex items-center justify-start h-20 gap-2">
                            {activePortalName ? (
                                <nav className="flex items-center min-w-0 gap-3">
                                    <div className="flex items-center min-w-0 gap-1.5">
                                        <span className="text-lg font-medium truncate text-n-slate-12">
                                            {activePortalName}
                                        </span>
                                        <div className="relative shrink-0 group">
                                            <div ref={switcherRef}>
                                                <Button
                                                    icon="i-lucide-chevron-down"
                                                    variant={showPortalSwitcher ? 'faded' : 'ghost'}
                                                    slate
                                                    xs
                                                    className="rounded-md group-hover:bg-n-slate-3 hover:bg-n-slate-3 [&>span]:size-4"
                                                    onClick={() => setShowPortalSwitcher(open => !open)}
                                                />
                                                {showPortalSwitcher ? (
                                                    <PortalSwitcher
                                                        currentPortalSlug={portalSlug}
                                                        className="absolute ltr:left-0 rtl:right-0 top-9"
                                                        onClose={() => setShowPortalSwitcher(false)}
                                                        onCreatePortal={() => createPortalDialogRef.current?.open()}
                                                    />
                                                ) : null}
                                            </div>
                                            <CreatePortalDialog ref={createPortalDialogRef} />
                                        </div>
                                    </div>

                                    {breadcrumbLabel ? (
                                        <>
                                            <div className="w-0.5 h-4 rounded-2xl bg-n-weak shrink-0" />
                                            <span className="pl-1.5 text-lg font-medium truncate text-n-slate-12">
                                                {breadcrumbLabel}
                                            </span>
                                        </>
                                    ) : null}
                                </nav>
                            ) : null}
                            <div className="flex justify-end min-w-0 grow">{titleActions}</div>
                        </div>
                    ) : null}
                    {headerActions}
                </div>
            </header>
            <main className="flex-1 px-6 overflow-y-auto">
                <div className="w-full max-w-5xl mx-auto py-3">{content}</div>
            </main>
            {showPaginationFooter ? (
                <footer className="sticky bottom-0 z-10">
                    <PaginationFooter
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        className="max-w-[67rem]"
                        onPageChange={page => onPageChange?.(page)}
                    />
                </footer>
            ) : null}
            {children}
        </section>
    );
}
