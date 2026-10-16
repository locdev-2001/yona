import Tabs from '../../components/ui/Tabs';
import type { AssigneeTab } from '../types';

// Port từ dashboard/components/widgets/ChatTypeTabs.vue — bỏ phím tắt Alt+N (B3).
export interface ChatTypeTabItem {
    key: AssigneeTab;
    name: string;
    count: number;
    badgeTone?: 'neutral' | 'warning';
}

interface ChatTypeTabsProps {
    items: ChatTypeTabItem[];
    activeTab: AssigneeTab;
    onChatTabChange: (tab: AssigneeTab) => void;
}

export default function ChatTypeTabs({ items, activeTab, onChatTabChange }: ChatTypeTabsProps) {
    const activeTabIndex = items.findIndex(item => item.key === activeTab);

    const onTabChange = (selectedTabIndex: number) => {
        if (selectedTabIndex >= 0 && selectedTabIndex < items.length) {
            const selectedItem = items[selectedTabIndex];
            if (selectedItem.key !== activeTab) {
                onChatTabChange(selectedItem.key);
            }
        }
    };

    return (
        <Tabs
            items={items.map(item => ({ ...item, showBadge: true }))}
            index={activeTabIndex}
            isCompact
            className="w-full ps-3 pe-0 -mt-1 py-0 [&_ul]:p-0 h-10 text-sm [&_a]:font-medium"
            onChange={onTabChange}
        />
    );
}
