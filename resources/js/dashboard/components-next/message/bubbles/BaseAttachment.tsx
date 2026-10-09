import type { ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import { EXTERNAL_LINK_PROPS } from 'shared/helpers/externalLinks';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Port từ dashboard/components-next/message/bubbles/BaseAttachment.vue.
interface BaseAttachmentBubbleProps {
    icon?: string;
    iconBgColor?: string;
    senderTranslationKey: string;
    content: string;
    title?: string;
    // `v-if="action"` bên gốc — bubble không có hành động nào thì bỏ hẳn nút.
    action?: { label: string; href?: string; onClick?: () => void } | null;
    iconSlot?: ReactNode;
    children?: ReactNode;
}

export default function BaseAttachmentBubble({
    icon,
    iconBgColor = 'bg-n-alpha-3',
    senderTranslationKey,
    content,
    title = '',
    action,
    iconSlot,
    children,
}: BaseAttachmentBubbleProps) {
    const { sender } = useMessageContext();
    const senderName = sender?.name || '';

    return (
        <BaseBubble className="overflow-hidden p-3" dataBubbleName="attachment">
            <div className="grid gap-4 min-w-64">
                <div className="grid gap-3">
                    <div className={`size-8 rounded-lg grid place-content-center ${iconBgColor}`}>
                        {iconSlot ?? <Icon icon={icon!} className="text-white size-4" />}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                        {senderName ? (
                            <div className="text-n-slate-12 text-sm truncate">
                                {t(senderTranslationKey, { sender: senderName })}
                            </div>
                        ) : null}
                        {children ?? (
                            <>
                                {title ? <div className="truncate text-sm text-n-slate-12">{title}</div> : null}
                                {content ? <div className="truncate text-sm text-n-slate-11">{content}</div> : null}
                            </>
                        )}
                    </div>
                </div>
                {action ? (
                <div className="mb-2">
                    {action.href ? (
                        <a
                            href={action.href}
                            {...EXTERNAL_LINK_PROPS}
                            className="w-full block bg-n-solid-3 px-4 py-2 rounded-lg text-sm text-center border border-n-container"
                        >
                            {action.label}
                        </a>
                    ) : (
                        <button
                            className="w-full bg-n-solid-3 px-4 py-2 rounded-lg text-sm text-center border border-n-container"
                            onClick={action.onClick}
                        >
                            {action.label}
                        </button>
                    )}
                </div>
                ) : null}
            </div>
        </BaseBubble>
    );
}
