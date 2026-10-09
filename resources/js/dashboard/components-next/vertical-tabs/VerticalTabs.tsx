import type { ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ components-next/vertical-tabs/VerticalTabs.vue.
export interface VerticalTab {
    id: string;
    label: string;
    icon?: string;
}

interface VerticalTabsProps {
    tabs: VerticalTab[];
    activeTab: string;
    contentClass?: string;
    renderPanel: (tab: VerticalTab) => ReactNode;
    onChange: (id: string) => void;
}

export default function VerticalTabs({
    tabs,
    activeTab,
    contentClass = '',
    renderPanel,
    onChange,
}: VerticalTabsProps) {
    return (
        <div className="flex flex-col w-full gap-4 md:flex-row md:items-start md:gap-8">
            <nav className="flex flex-row w-full gap-1 pb-2 overflow-x-auto no-scrollbar shrink-0 md:sticky md:top-0 md:flex-col md:w-48 md:gap-0.5 md:overflow-visible">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`flex items-center gap-2 px-2.5 py-2 text-sm text-start transition-colors rounded-lg shrink-0 min-h-9 md:w-full ${
                            activeTab === tab.id
                                ? 'bg-n-alpha-2 text-n-slate-12 font-medium'
                                : 'text-n-slate-11 hover:bg-n-alpha-1 hover:text-n-slate-12'
                        }`}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        onClick={() => onChange(tab.id)}
                    >
                        {tab.icon ? <Icon icon={tab.icon} className="shrink-0 size-4" /> : null}
                        <span className="min-w-0 whitespace-nowrap md:whitespace-normal">{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className={`flex flex-col flex-1 w-full min-w-0 ${contentClass}`.trim()}>
                {/* Mọi panel giữ nguyên trong cây, chỉ ẩn/hiện — bản nháp chưa lưu không mất khi đổi tab. */}
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className="flex flex-col w-full min-w-0"
                        style={{ display: activeTab === tab.id ? undefined : 'none' }}
                    >
                        {renderPanel(tab)}
                    </div>
                ))}
            </div>
        </div>
    );
}
