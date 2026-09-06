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

export default function SearchTabs({ tabs, selectedTab, onTabChange }: SearchTabsProps) {
    return (
        <div className="flex items-center justify-between mt-7 mb-4">
            <TabBar
                tabs={tabs.map(tab => ({
                    label: tab.name,
                    value: tab.key,
                    count: tab.showBadge ? (tab.count ?? undefined) : undefined,
                }))}
                initialActiveTab={selectedTab}
                onTabChanged={tab => onTabChange(tab.value as SearchTab)}
            />
        </div>
    );
}
