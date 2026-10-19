import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components-next/Campaigns/CampaignLayout.vue — tiêu đề +
// nút tạo, hộp thoại tạo bung ra ngay dưới nút và đóng khi bấm ra ngoài.
interface CampaignLayoutProps {
    headerTitle: string;
    buttonLabel: string;
    action?: ReactNode;
    children: ReactNode;
    onClick: () => void;
    onClose: () => void;
}

export default function CampaignLayout({
    headerTitle,
    buttonLabel,
    action,
    children,
    onClick,
    onClose,
}: CampaignLayoutProps) {
    const actionRef = useRef<HTMLDivElement>(null);

    // v-on-click-outside — bỏ qua backdrop của hộp thoại tạo liên kết trong editor.
    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || actionRef.current?.contains(target)) return;
            if (target.closest('dialog.ProseMirror-prompt-backdrop')) return;
            onClose();
        };

        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [onClose]);

    return (
        <section className="flex flex-col w-full h-full overflow-hidden bg-n-surface-1">
            <header className="sticky top-0 z-10 px-6">
                <div className="w-full max-w-5xl mx-auto">
                    <div className="flex items-center justify-between w-full h-20 gap-2">
                        <span className="text-heading-1 text-n-slate-12">{headerTitle}</span>
                        <div ref={actionRef} className="relative group/campaign-button">
                            <Button
                                label={buttonLabel}
                                icon="i-lucide-plus"
                                size="sm"
                                className="group-hover/campaign-button:brightness-110"
                                onClick={onClick}
                            />
                            {action}
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex-1 px-6 overflow-y-auto">
                <div className="w-full max-w-5xl mx-auto py-4">{children}</div>
            </main>
        </section>
    );
}
