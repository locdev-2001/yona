import { useEffect, useRef, useState } from 'react';

import { revealHorizontally } from 'shared/helpers/revealHorizontally';

// Port từ dashboard/components-next/tabbar/TabBar.vue — thanh tab với
// indicator trượt đo theo offset của nút đang active.
export interface TabBarTab {
    label: string;
    value: string;
    count?: number;
}

interface TabBarProps {
    tabs: TabBarTab[];
    initialActiveTab?: number;
    className?: string;
    onTabChanged: (tab: TabBarTab) => void;
}

export default function TabBar({ tabs, initialActiveTab = 0, className = '', onTabChanged }: TabBarProps) {
    const activeTab = initialActiveTab;
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [indicatorStyle, setIndicatorStyle] = useState<{ left?: string; width?: string }>({});
    const [enableTransition, setEnableTransition] = useState(false);

    // Bất kỳ tab nào đổi độ rộng (vd số đếm nạp về sau làm nhãn dài ra) đều làm tab đang
    // chọn xê dịch: đo lại indicator và cuộn lại để khung cuộn ngang (màn hẹp) không cắt nó.
    useEffect(() => {
        const activeElement = tabRefs.current[activeTab];
        if (!activeElement) return undefined;

        const syncActiveTab = () => {
            setIndicatorStyle({
                left: `${activeElement.offsetLeft}px`,
                width: `${activeElement.offsetWidth}px`,
            });
            revealHorizontally(activeElement);
        };

        syncActiveTab();
        const observer = new ResizeObserver(syncActiveTab);
        tabRefs.current.slice(0, tabs.length).forEach(tabElement => {
            if (tabElement) observer.observe(tabElement);
        });

        return () => observer.disconnect();
    }, [activeTab, tabs.length]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setEnableTransition(true));

        return () => cancelAnimationFrame(frame);
    }, []);

    // Chiều cao chỉ đặt ở khung: màn nhỏ cao 44px cho vừa ngón tay, từ md về 32px;
    // indicator và nút giãn theo khung. Tab chưa chọn chỉ thu nhỏ từ md để màn nhỏ
    // giữ trọn vùng chạm 44px (transform thu nhỏ cả vùng nhận chạm).
    return (
        <div
            className={`relative flex items-center h-11 md:h-8 rounded-lg bg-n-surface-field w-fit transition-all duration-200 ease-out has-[button:active]:scale-[1.01] ${className}`.trim()}
        >
            <div
                className={`absolute rounded-lg bg-n-surface-raised pointer-events-none inset-y-0.5 ${enableTransition ? 'transition-all duration-300 ease-out' : ''}`.trim()}
                style={indicatorStyle}
            />

            {/* Button phải là con TRỰC TIẾP của root — caller gốc dùng selector
                [&>button]:w-full (ContactManageView) nên không được bọc thêm div. */}
            {tabs.map((tab, index) => (
                <button
                    key={index}
                    ref={el => {
                        tabRefs.current[index] = el;
                    }}
                    type="button"
                    className={`relative z-10 h-full px-4 truncate text-sm border-0 outline-1 outline-transparent focus-visible:outline-2 focus-visible:outline-n-brand rounded-lg transition-all duration-200 ease-out hover:text-n-brand active:scale-[1.02] ${
                        activeTab === index ? 'text-n-blue-11 scale-100' : 'text-n-slate-10 md:scale-[0.98]'
                    }`}
                    onClick={() => onTabChanged(tabs[index])}
                >
                    {tab.label} {tab.count ? `(${tab.count})` : ''}
                </button>
            ))}
        </div>
    );
}
