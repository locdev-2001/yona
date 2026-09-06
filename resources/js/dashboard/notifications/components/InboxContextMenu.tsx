import type { ReactNode } from 'react';

import ContextMenu from 'dashboard/components/ui/ContextMenu';
import MenuItem from 'dashboard/components/widgets/conversation/contextMenu/MenuItem';

// Port từ routes/dashboard/inbox/components/InboxContextMenu.vue.
export interface InboxMenuItem {
    key: string;
    icon: string;
    label: string;
}

interface InboxContextMenuProps {
    x: number;
    y: number;
    menuItems: InboxMenuItem[];
    onClose: () => void;
    onSelectAction: (key: string) => void;
}

export default function InboxContextMenu({
    x,
    y,
    menuItems,
    onClose,
    onSelectAction,
}: InboxContextMenuProps): ReactNode {
    return (
        <ContextMenu x={x} y={y} onClose={onClose}>
            <div className="p-1 rounded-md shadow-xl bg-n-alpha-3/50 backdrop-blur-[100px] outline-1 outline outline-n-weak/50">
                {menuItems.map(item => (
                    <MenuItem
                        key={item.key}
                        label={item.label}
                        icon={item.icon}
                        className="!w-48"
                        onClick={() => {
                            onSelectAction(item.key);
                            onClose();
                        }}
                    />
                ))}
            </div>
        </ContextMenu>
    );
}
