import { useRef, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { useMacros } from 'dashboard/settings/macros/macrosStore';
import { useMacroOptionSets } from 'dashboard/settings/macros/useMacroOptionSets';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import MacroItem from './MacroItem';
import { macrosOrderPatch, orderMacros } from './useOrderedMacros';
import { useMacroExecution } from './useMacroExecution';

// Port từ conversation/Macros/List.vue. `vuedraggable` đổi sang HTML5
// drag-and-drop như MacroNodes; thứ tự sắp xong ghi vào ui_settings.
export default function MacroList({ conversationId }: { conversationId: number }) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { uiSettings, updateUISettings } = useConversation();

    const { records, isFetching } = useMacros(accountId);
    const optionSets = useMacroOptionSets(accountId);
    const { executingMacroId, execute } = useMacroExecution(accountId);

    const [draggableIndex, setDraggableIndex] = useState<number | null>(null);
    const draggedIndex = useRef<number | null>(null);

    const macros = orderMacros(records, uiSettings);

    const moveMacro = (from: number, to: number) => {
        if (from === to) return;
        const reordered = [...macros];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        updateUISettings(macrosOrderPatch(reordered));
    };

    if (isFetching) {
        return (
            <div className="flex items-center gap-2 justify-center p-6 text-n-slate-12">
                <span className="text-sm">{t('MACROS.LOADING')}</span>
                <Spinner className="size-5" />
            </div>
        );
    }

    if (!macros.length) {
        return (
            <div className="p-3">
                <p className="flex flex-col items-center justify-center h-full">{t('MACROS.LIST.404')}</p>
                <Link href={accountScopedUrl(accountId, 'settings/macros')}>
                    <Button faded xs icon="i-lucide-plus" className="mt-1" label={t('MACROS.HEADER_BTN_TXT')} />
                </Link>
            </div>
        );
    }

    return (
        <div className="p-1">
            {macros.map((macro, index) => (
                <div
                    key={macro.id}
                    draggable={draggableIndex === index}
                    onDragStart={() => {
                        draggedIndex.current = index;
                    }}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                        event.preventDefault();
                        if (draggedIndex.current !== null) moveMacro(draggedIndex.current, index);
                        draggedIndex.current = null;
                        setDraggableIndex(null);
                    }}
                    onDragEnd={() => setDraggableIndex(null)}
                >
                    <MacroItem
                        macro={macro}
                        optionSets={optionSets}
                        isExecuting={executingMacroId === macro.id}
                        onExecute={() => void execute(macro, conversationId)}
                        onDragHandleDown={() => setDraggableIndex(index)}
                        onDragHandleUp={() => setDraggableIndex(null)}
                    />
                </div>
            ))}
        </div>
    );
}
