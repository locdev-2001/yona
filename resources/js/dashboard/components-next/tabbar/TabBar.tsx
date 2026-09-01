import { useEffect, useRef, useState } from 'react';

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

    useEffect(() => {
        const activeElement = tabRefs.current[activeTab];
        if (!activeElement) return undefined;

        const updateIndicator = () => {
            setIndicatorStyle({
                left: `${activeElement.offsetLeft}px`,
                width: `${activeElement.offsetWidth}px`,
            });
        };

        updateIndicator();
        const observer = new ResizeObserver(updateIndicator);
        observer.observe(activeElement);

        return () => observer.disconnect();
    }, [activeTab, tabs]);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setEnableTransition(true));

        return () => cancelAnimationFrame(frame);
    }, []);

    const showDivider = (index: number) =>
        (index > activeTab && index < tabs.length - 1) || (index < activeTab - 1 && index > -1);

    return (
        <div
            className={`relative flex items-center h-8 rounded-lg bg-n-alpha-1 dark:bg-n-solid-1 w-fit transition-all duration-200 ease-out has-[button:active]:scale-[1.01] ${className}`.trim()}
        >
            <div
                className={`absolute rounded-lg bg-n-solid-active shadow-sm pointer-events-none h-8 outline-1 outline outline-n-container inset-y-0 ${enableTransition ? 'transition-all duration-300 ease-out' : ''}`.trim()}
                style={indicatorStyle}
            />

            {tabs.map((tab, index) => (
                <div key={index} className="contents">
                    <button
                        ref={el => {
                            tabRefs.current[index] = el;
                        }}
                        type="button"
                        className={`relative z-10 px-4 truncate py-1.5 text-sm border-0 outline-1 outline-transparent rounded-lg transition-all duration-200 ease-out hover:text-n-brand active:scale-[1.02] ${
                            activeTab === index ? 'text-n-blue-11 scale-100' : 'text-n-slate-10 scale-[0.98]'
                        }`}
                        onClick={() => onTabChanged(tabs[index])}
                    >
                        {tab.label} {tab.count ? `(${tab.count})` : ''}
                    </button>
                    {index < tabs.length - 1 ? (
                        <div
                            className={`w-px h-3.5 rounded my-auto transition-colors duration-300 ease-in-out ${
                                showDivider(index) ? 'bg-n-strong' : 'bg-transparent dark:bg-transparent'
                            }`}
                        />
                    ) : null}
                </div>
            ))}
        </div>
    );
}
