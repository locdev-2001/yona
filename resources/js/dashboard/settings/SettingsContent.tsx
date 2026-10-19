import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

import SettingsHeader from './SettingsHeader';

// Port từ dashboard/routes/dashboard/settings/Wrapper.vue — router-view +
// keep-alive là chi tiết Vue router, children thay thế.
interface SettingsContentProps {
    headerTitle?: string;
    showBackButton?: boolean;
    backUrl?: string;
    children: ReactNode;
}

// Bản gốc đặt class ngay trên <router-view>: Vue gộp class đó vào PHẦN TỬ GỐC của
// trang con chứ không bọc thêm thẻ. Bọc thêm div sẽ cộng dồn px-4 với px-6 của
// trang con → lệch chiều ngang. cloneElement tái hiện đúng cơ chế fallthrough.
const CONTENT_CLASS = 'px-4 overflow-hidden';

interface ClassNameProps {
    className?: string;
}

export default function SettingsContent({
    headerTitle = '',
    showBackButton = false,
    backUrl = '',
    children,
}: SettingsContentProps) {
    const showSettingsHeader = Boolean(headerTitle) || showBackButton;

    const content = Children.map(children, child => {
        if (!isValidElement(child)) return child;

        const element = child as ReactElement<ClassNameProps>;

        return cloneElement(element, {
            className: [element.props.className, CONTENT_CLASS].filter(Boolean).join(' '),
        });
    });

    return (
        <div className="flex flex-col h-full m-0 bg-n-surface-1 w-full">
            {showSettingsHeader ? (
                <SettingsHeader
                    headerTitle={headerTitle}
                    showBackButton={showBackButton}
                    backUrl={backUrl}
                />
            ) : null}
            {content}
        </div>
    );
}
