import { useEffect, useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../i18n';
import { useNotifications } from '../NotificationsContext';
import InboxDisplayMenu from './InboxDisplayMenu';
import InboxOptionMenu from './InboxOptionMenu';

// Port từ routes/dashboard/inbox/components/InboxListHeader.vue.
interface InboxListHeaderProps {
    isContextMenuOpen: boolean;
    onRedirect: () => void;
}

export default function InboxListHeader({ isContextMenuOpen, onRedirect }: InboxListHeaderProps) {
    const { filters, applyFilter, markAllRead, deleteAll, deleteAllRead } = useNotifications();
    const [showDisplayMenu, setShowDisplayMenu] = useState(false);
    const [showOptionMenu, setShowOptionMenu] = useState(false);

    const displayMenuRef = useRef<HTMLDivElement>(null);
    const optionMenuRef = useRef<HTMLDivElement>(null);
    useClickAway(displayMenuRef, () => setShowDisplayMenu(false), showDisplayMenu);
    useClickAway(optionMenuRef, () => setShowOptionMenu(false), showOptionMenu);

    // watch isContextMenuOpen của bản gốc: mở menu chuột phải thì đóng hai popover.
    useEffect(() => {
        if (isContextMenuOpen) {
            setShowDisplayMenu(false);
            setShowOptionMenu(false);
        }
    }, [isContextMenuOpen]);

    const onOptionClick = (key: string) => {
        const actions: Record<string, () => Promise<void>> = {
            mark_all_read: markAllRead,
            delete_all: deleteAll,
            delete_all_read: deleteAllRead,
        };
        void actions[key]?.().catch(() => undefined);
        setShowOptionMenu(false);
        onRedirect();
    };

    return (
        <div className="flex items-center justify-between w-full gap-1 h-[3.25rem] ltr:pl-4 rtl:pr-4 ltr:pr-3 rtl:pl-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <h1 className="text-heading-2 truncate text-n-slate-12 min-w-0">{t('INBOX.LIST.TITLE')}</h1>
                <div ref={displayMenuRef} className="relative">
                    <Button
                        label={t('INBOX.LIST.DISPLAY_DROPDOWN')}
                        icon="i-lucide-chevron-down"
                        trailingIcon
                        slate
                        xs
                        variant={showDisplayMenu ? 'faded' : 'solid'}
                        onClick={() => setShowDisplayMenu(open => !open)}
                    />
                    {showDisplayMenu ? (
                        <InboxDisplayMenu
                            filters={filters}
                            className="absolute mt-1 top-full ltr:left-0 rtl:right-0"
                            onFilter={option => {
                                applyFilter(option);
                                setShowDisplayMenu(false);
                                onRedirect();
                            }}
                        />
                    ) : null}
                </div>
            </div>
            <div ref={optionMenuRef} className="relative flex items-center gap-1">
                <Button
                    icon="i-lucide-sliders-vertical"
                    slate
                    sm
                    variant={showOptionMenu ? 'faded' : 'ghost'}
                    onClick={() => setShowOptionMenu(open => !open)}
                />
                {showOptionMenu ? (
                    <InboxOptionMenu
                        className="absolute top-full mt-1 ltr:right-0 ltr:lg:right-[unset] rtl:left-0 rtl:lg:left-[unset]"
                        onOptionClick={onOptionClick}
                    />
                ) : null}
            </div>
        </div>
    );
}
