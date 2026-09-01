import { Fragment } from 'react';

import { t } from '../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import EmojiIcon from 'dashboard/components-next/emoji-icon-picker/EmojiIcon';

// Port từ dashboard/components-next/breadcrumb/Breadcrumb.vue.
export interface BreadcrumbItem {
    label: string;
    link?: string;
    emoji?: string;
    iconColor?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    onClick?: (item: BreadcrumbItem, index: number) => void;
}

export default function Breadcrumb({ items, onClick }: BreadcrumbProps) {
    return (
        <nav aria-label={t('BREADCRUMB.ARIA_LABEL')} className="flex items-center h-8 min-w-0">
            <ol className="flex items-center mb-0 min-w-0">
                {items.map((item, index) => (
                    <li
                        key={index}
                        className={`flex items-center ${index === items.length - 1 ? 'min-w-0 flex-1' : ''}`.trim()}
                    >
                        {index > 0 ? (
                            <Icon
                                icon="i-lucide-chevron-right"
                                className="flex-shrink-0 mx-2 size-4 text-n-slate-11 dark:text-n-slate-11"
                            />
                        ) : null}

                        {index !== items.length - 1 ? (
                            <button
                                type="button"
                                className="inline-flex items-center justify-center min-w-0 gap-2 p-0 text-sm font-medium transition-all duration-200 ease-in-out border-0 rounded-lg text-n-slate-11 hover:text-n-slate-12 outline-transparent max-w-56"
                                onClick={() => onClick?.(item, index)}
                            >
                                <span className="min-w-0 truncate">{item.label}</span>
                            </button>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-sm truncate min-w-0">
                                {item.emoji ? (
                                    <Fragment>
                                        <EmojiIcon
                                            value={item.emoji}
                                            color={item.iconColor}
                                            className="flex-shrink-0 size-4"
                                        />
                                    </Fragment>
                                ) : null}
                                <span className="truncate text-n-slate-12">{item.label}</span>
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
