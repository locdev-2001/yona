import type { ReactNode } from 'react';

// Port từ dashboard/components/ModalHeader.vue
interface ModalHeaderProps {
    headerTitle: string;
    headerContent?: string;
    headerContentValue?: string;
    headerImage?: string;
    children?: ReactNode;
}

export default function ModalHeader({
    headerTitle,
    headerContent = '',
    headerContentValue = '',
    headerImage = '',
    children,
}: ModalHeaderProps) {
    return (
        <div className="flex flex-col items-start px-8 pt-8 pb-0">
            {headerImage ? <img src={headerImage} alt="No image" /> : null}
            <h2 data-test-id="modal-header-title" className="text-base font-semibold leading-6 text-n-slate-12">
                {headerTitle}
            </h2>
            {headerContent ? (
                <p
                    data-test-id="modal-header-content"
                    className="w-full mt-2 text-sm leading-5 break-words text-n-slate-11"
                >
                    {headerContent}
                    {headerContentValue ? (
                        <span className="text-sm font-semibold text-n-slate-11">{headerContentValue}</span>
                    ) : null}
                </p>
            ) : null}
            {children}
        </div>
    );
}
