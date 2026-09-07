import '@chatwoot/ninja-keys';
import './commandbar.scss';
import { useEffect, useMemo, useRef, useState } from 'react';

import { t } from '../../i18n';
import CommandBarFooter from './CommandBarFooter';
import { useAppearanceHotKeys } from './useAppearanceHotKeys';
import { useGoToCommandHotKeys } from './useGoToCommandHotKeys';
import { useCommandBarActions } from './commandBarStore';
import type { NinjaKeysElement } from './commandBarStore';

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'ninja-keys': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                placeholder?: string;
                hideBreadcrumbs?: boolean;
                noAutoLoadMdIcons?: boolean;
            };
        }
    }
}

const SNOOZE_PARENT_IDS = ['snooze_conversation', 'snooze_notification', 'bulk_action_snooze_conversation'];

interface NinjaSelectedDetail {
    search?: string;
    action?: { id?: string; children?: string[] };
}

interface NinjaChangeDetail {
    search?: string;
    actions?: Array<{ parent?: string }>;
}

// Port từ routes/dashboard/commands/commandbar.vue — khung command bar (web component
// @chatwoot/ninja-keys 1.2.3). B5: danh sách action đến từ commandBarStore (nguồn
// conversation), placeholder đổi khi đang trong nhánh snooze. Nợ B10: gợi ý snooze
// NLP khi gõ (buildDynamicSnoozeActions + snoozeDateParser), isPaywalled,
// ConversationResolveAttributesModal (EE), setContextMenuChatId, tracking.
export default function CommandBar() {
    const ninjaRef = useRef<NinjaKeysElement>(null);
    // Các nguồn action không phụ thuộc hội thoại (gốc gọi thẳng trong commandbar.vue);
    // nguồn `conversation` do ConversationView đăng ký.
    useGoToCommandHotKeys();
    useAppearanceHotKeys();
    const actions = useCommandBarActions();
    const [currentCommandRoot, setCurrentCommandRoot] = useState<string | null>(null);
    const [hasNoMatches, setHasNoMatches] = useState(false);

    const placeholder = useMemo(
        () =>
            SNOOZE_PARENT_IDS.includes(currentCommandRoot ?? '')
                ? t('COMMAND_BAR.SNOOZE_PLACEHOLDER')
                : t('COMMAND_BAR.SEARCH_PLACEHOLDER'),
        [currentCommandRoot],
    );

    useEffect(() => {
        if (ninjaRef.current) ninjaRef.current.data = actions;
    }, [actions]);

    useEffect(() => {
        const element = ninjaRef.current;
        if (!element) return undefined;

        // patchNinjaKeysOpenClose gốc: biết đang mở vào nhánh nào để đổi placeholder.
        const originalOpen = element.open.bind(element);
        const originalClose = element.close.bind(element);
        element.open = (options = {}) => {
            setCurrentCommandRoot(options.parent ?? null);
            setHasNoMatches(false);
            originalOpen(options);
        };
        element.close = () => {
            setCurrentCommandRoot(null);
            setHasNoMatches(false);
            originalClose();
        };

        const onSelected = (event: Event) => {
            const { action } = (event as CustomEvent<NinjaSelectedDetail>).detail ?? {};
            setHasNoMatches(false);
            if (Array.isArray(action?.children) && action.children.length) {
                setCurrentCommandRoot(action.id ?? null);
            }
        };
        const onChange = (event: Event) => {
            const { actions: matched = [] } = (event as CustomEvent<NinjaChangeDetail>).detail ?? {};
            // ninja-keys không báo "không có kết quả"; danh sách rỗng là tín hiệu duy nhất.
            setHasNoMatches(matched.length === 0);
            if (matched.length > 0) {
                const uniqueParents = [...new Set(matched.map(item => item.parent).filter(Boolean))];
                setCurrentCommandRoot(uniqueParents.length === 1 ? (uniqueParents[0] as string) : null);
            }
        };
        const onClosed = () => {
            setCurrentCommandRoot(null);
            setHasNoMatches(false);
        };

        element.addEventListener('selected', onSelected);
        element.addEventListener('change', onChange);
        element.addEventListener('closed', onClosed);

        return () => {
            element.open = originalOpen;
            element.close = originalClose;
            element.removeEventListener('selected', onSelected);
            element.removeEventListener('change', onChange);
            element.removeEventListener('closed', onClosed);
        };
    }, []);

    return (
        <ninja-keys ref={ninjaRef} noAutoLoadMdIcons hideBreadcrumbs placeholder={placeholder}>
            <CommandBarFooter hasNoMatches={hasNoMatches} />
        </ninja-keys>
    );
}
