import Tabs from '../../components/ui/Tabs';
import type { ChatListTab } from '../types';

// Cùng một thanh tab cho mọi cỡ màn; dưới 768px thành thanh chia đều, ô cao 44px.
export interface ChatTypeTabItem {
    key: ChatListTab;
    name: string;
    count: number;
    badgeTone?: 'neutral' | 'warning';
}

interface ChatTypeTabsProps {
    items: ChatTypeTabItem[];
    activeTab: ChatListTab;
    onChatTabChange: (tab: ChatListTab) => void;
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
            items={items.map(item => ({ ...item, showBadge: item.count > 0 }))}
            index={activeTabIndex}
            isCompact
            isStretchedBelowMd
            className="w-full ps-3 pe-0 -mt-1 py-0 [&_ul]:p-0 h-10 text-sm [&_a]:font-medium max-md:h-auto max-md:mt-0 max-md:px-3 max-md:pb-2"
            onChange={onTabChange}
        />
    );
}
