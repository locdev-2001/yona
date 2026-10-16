import { useEffect, useRef, useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/components/ui/Tabs/{Tabs,TabsItem}.vue — provide/inject
// thay bằng props phẳng (items + activeIndex).
export interface TabItem {
    key: string;
    name: string;
    count?: number;
    showBadge?: boolean;
    // Số đếm là việc đang chờ người nhận (vd hội thoại chưa gán): tô amber khi > 0.
    badgeTone?: 'neutral' | 'warning';
    disabled?: boolean;
}

interface TabsProps {
    items: TabItem[];
    index: number;
    isCompact?: boolean;
    className?: string;
    onChange: (index: number) => void;
}

export default function Tabs({ items, index, isCompact = false, className = '', onChange }: TabsProps) {
    const listRef = useRef<HTMLUListElement>(null);
    const [hasScroll, setHasScroll] = useState(false);

    useEffect(() => {
        const computeScrollWidth = () => {
            const list = listRef.current;
            if (list) setHasScroll(list.scrollWidth > list.clientWidth);
        };

        computeScrollWidth();
        window.addEventListener('resize', computeScrollWidth);
        return () => window.removeEventListener('resize', computeScrollWidth);
    }, [items]);

    const onScrollClick = (direction: 'left' | 'right') => {
        const list = listRef.current;
        if (!list) return;
        list.scrollTo({
            top: 0,
            left: list.scrollLeft + (direction === 'left' ? -100 : 100),
            behavior: 'smooth',
        });
    };

    return (
        <div className={`flex ${className}`}>
            {hasScroll ? (
                <button
                    type="button"
                    className="items-center rounded-none cursor-pointer flex h-auto justify-center min-w-8"
                    onClick={() => onScrollClick('left')}
                >
                    <Icon icon="i-lucide-chevron-left" className="size-4" />
                </button>
            ) : null}
            <ul
                ref={listRef}
                className={`flex min-w-[6.25rem] py-0 px-4 list-none mb-0 ${
                    hasScroll ? 'overflow-hidden py-0 px-1 max-w-[calc(100%-64px)]' : ''
                }`}
            >
                {items.map((item, itemIndex) => {
                    const active = itemIndex === index;
                    const isWarning = item.badgeTone === 'warning' && (item.count ?? 0) > 0;
                    const badgeColor = isWarning
                        ? 'bg-n-amber-3 text-n-amber-11'
                        : active
                          ? 'bg-n-blue-3 text-n-blue-11'
                          : 'bg-n-alpha-1 text-n-slate-10';

                    return (
                        <li
                            key={item.key}
                            className="flex-shrink-0 my-0 mx-2 ltr:first:ml-0 rtl:first:mr-0 ltr:last:mr-0 rtl:last:ml-0 hover:text-n-slate-12"
                        >
                            <a
                                className={[
                                    'flex items-center flex-row select-none cursor-pointer relative after:absolute after:bottom-px after:left-0 after:right-0 after:h-[2px] after:rounded-full after:transition-all after:duration-200 text-button',
                                    active
                                        ? 'text-n-blue-11 after:bg-n-brand after:opacity-100'
                                        : 'text-n-slate-11 after:bg-transparent after:opacity-0',
                                    isCompact ? 'py-2.5' : '!text-base py-3',
                                ].join(' ')}
                                onClick={event => {
                                    event.preventDefault();
                                    if (!item.disabled) onChange(itemIndex);
                                }}
                            >
                                {item.name}
                                {item.showBadge ? (
                                    <div
                                        className={[
                                            'rounded-full h-5 flex items-center justify-center text-xs font-medium my-0 ltr:ml-1 rtl:mr-1 px-1.5 py-0 min-w-[20px]',
                                            badgeColor,
                                        ].join(' ')}
                                    >
                                        <span>{item.count ?? 0}</span>
                                    </div>
                                ) : null}
                            </a>
                        </li>
                    );
                })}
            </ul>
            {hasScroll ? (
                <button
                    type="button"
                    className="items-center rounded-none cursor-pointer flex h-auto justify-center min-w-8"
                    onClick={() => onScrollClick('right')}
                >
                    <Icon icon="i-lucide-chevron-right" className="size-4" />
                </button>
            ) : null}
        </div>
    );
}
