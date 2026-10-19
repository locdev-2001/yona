import TabBar from 'dashboard/components-next/tabbar/TabBar';
import type { SearchTab } from '../types';

// Port từ dashboard/modules/search/components/SearchTabs.vue.
export interface SearchTabConfig {
    key: SearchTab;
    name: string;
    count: number | null;
    showBadge: boolean;
}

interface SearchTabsProps {
    tabs: SearchTabConfig[];
    selectedTab: number;
    onTabChange: (tab: SearchTab) => void;
}

// Màn hẹp không đủ chỗ cho mọi tab: thanh tab tự cuộn ngang, không đẩy tràn cả
// trang. Đệm p-1 (bù bằng lề âm) để viền và hiệu ứng nhấn của tab không bị khung cuộn cắt.
export default function SearchTabs({ tabs, selectedTab, onTabChange }: SearchTabsProps) {
    return (
        <div className="flex items-center -mx-1 p-1 mt-6 mb-3 overflow-x-auto no-scrollbar">
            <TabBar
                tabs={tabs.map(tab => ({
                    label: tab.name,
                    value: tab.key,
                    count: tab.showBadge ? (tab.count ?? undefined) : undefined,
                }))}
                initialActiveTab={selectedTab}
                className="shrink-0"
                onTabChanged={tab => onTabChange(tab.value as SearchTab)}
            />
        </div>
    );
}
