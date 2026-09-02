import { useRef } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import { DropdownBody } from 'dashboard/components-next/dropdown-menu/base';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { t } from '../../../i18n';

// Port từ WootWriter/CopilotMenuBar.vue — menu ✨ với 2 khối (theo nội dung +
// chung) và submenu hover Change tone. Bỏ: nhánh selection-menu (gốc cũng tắt
// hasSelection = false), vị trí submenu động theo useWindowSize (luôn left-full).
interface CopilotMenuItem {
    label: string;
    key: string;
    icon?: string;
    subMenuItems?: { label: string; key: string }[];
}

interface CopilotMenuBarProps {
    hasContent?: boolean;
    conversationId?: number | null;
    replyMode: string;
    className?: string;
    onExecuteCopilotAction: (actionKey: string) => void;
}

const ITEM_CLASS = 'hover:!no-underline text-n-slate-12 font-normal text-xs w-full !justify-start';

export default function CopilotMenuBar({
    hasContent = false,
    conversationId = null,
    replyMode,
    className = '',
    onExecuteCopilotAction,
}: CopilotMenuBarProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    const menuItems: CopilotMenuItem[] = [];
    if (conversationId && replyMode === REPLY_EDITOR_MODES.REPLY && hasContent) {
        menuItems.push({
            label: t('INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.IMPROVE_REPLY'),
            key: 'improve',
            icon: 'i-fluent-pen-sparkle-24-regular',
        });
    }
    if (hasContent) {
        menuItems.push(
            {
                label: t('INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.CHANGE_TONE.TITLE'),
                key: 'change_tone',
                icon: 'i-fluent-sound-wave-circle-sparkle-24-regular',
                subMenuItems: ['PROFESSIONAL', 'CASUAL', 'STRAIGHTFORWARD', 'CONFIDENT', 'FRIENDLY'].map(tone => ({
                    label: t(`INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.CHANGE_TONE.OPTIONS.${tone}`),
                    key: tone.toLowerCase(),
                })),
            },
            {
                label: t('INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.GRAMMAR'),
                key: 'fix_spelling_grammar',
                icon: 'i-fluent-flow-sparkle-24-regular',
            },
        );
    }

    const generalMenuItems: CopilotMenuItem[] = [];
    if (conversationId && replyMode === REPLY_EDITOR_MODES.REPLY) {
        generalMenuItems.push({
            label: t('INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.SUGGESTION'),
            key: 'reply_suggestion',
            icon: 'i-fluent-chat-sparkle-16-regular',
        });
    }
    if (conversationId) {
        generalMenuItems.push({
            label: t('INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.SUMMARIZE'),
            key: 'summarize',
            icon: 'i-fluent-text-bullet-list-square-sparkle-32-regular',
        });
    }
    generalMenuItems.push({
        label: t('INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.ASK_COPILOT'),
        key: 'ask_copilot',
        icon: 'i-fluent-circle-sparkle-24-regular',
    });

    const handleMenuItemClick = (item: CopilotMenuItem) => {
        if (!item.subMenuItems) onExecuteCopilotAction(item.key);
    };

    return (
        <div ref={menuRef} className="contents">
            <DropdownBody className={`min-w-56 [&>ul]:gap-3 z-50 [&>ul]:px-4 [&>ul]:py-3.5 ${className}`}>
                {menuItems.length > 0 ? (
                    <div className="flex flex-col items-start gap-2.5">
                        {menuItems.map(item => (
                            <div key={item.key} className="w-full relative group/submenu">
                                <Button
                                    icon={item.icon}
                                    slate
                                    link
                                    sm
                                    className={ITEM_CLASS}
                                    onClick={() => handleMenuItemClick(item)}
                                >
                                    {item.subMenuItems ? (
                                        <div className="flex items-center gap-1 justify-between w-full">
                                            <span className="min-w-0 truncate">{item.label}</span>
                                            <Icon icon="i-lucide-chevron-right" className="text-n-slate-10 size-3" />
                                        </div>
                                    ) : (
                                        <span className="min-w-0 truncate">{item.label}</span>
                                    )}
                                </Button>
                                {item.subMenuItems ? (
                                    <DropdownBody
                                        className="group-hover/submenu:block hidden [&>ul]:gap-2 [&>ul]:px-3 [&>ul]:py-2.5 [&>ul]:dark:!border-n-strong max-h-[15rem] min-w-32 z-10 top-0 left-full"
                                    >
                                        {item.subMenuItems.map(subItem => (
                                            <Button
                                                key={subItem.key + subItem.label}
                                                label={subItem.label}
                                                slate
                                                link
                                                sm
                                                className={`${ITEM_CLASS} mb-1`}
                                                onClick={() => onExecuteCopilotAction(subItem.key)}
                                            />
                                        ))}
                                    </DropdownBody>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}

                {menuItems.length > 0 ? <div className="h-px w-full bg-n-strong" /> : null}

                <div className="flex flex-col items-start gap-3">
                    {generalMenuItems.map(item => (
                        <Button
                            key={item.key}
                            label={item.label}
                            icon={item.icon}
                            slate
                            link
                            sm
                            className={ITEM_CLASS}
                            onClick={() => handleMenuItemClick(item)}
                        />
                    ))}
                </div>
            </DropdownBody>
        </div>
    );
}
