import { useState } from 'react';

import { useAlert } from 'dashboard/composables/useAlert';
import { executeMacro } from 'dashboard/settings/macros/macrosStore';
import type { Macro } from 'dashboard/settings/macros/types';
import { t } from '../../../i18n';

// Port từ composables/useMacroExecution.js. Nhánh "thuộc tính bắt buộc khi
// resolve" (useConversationRequiredAttributes + ConversationResolveAttributesModal)
// là tính năng trả phí chưa port — xem settings/conversationWorkflow/Index.tsx —
// nên macro luôn chạy thẳng, đúng như hành vi gốc khi account không bật nó.
export async function runMacro(accountId: number, macro: Macro, conversationId: number): Promise<void> {
    try {
        await executeMacro(accountId, macro.id, [conversationId]);
        useAlert(t('MACROS.EXECUTE.EXECUTED_SUCCESSFULLY'));
    } catch {
        useAlert(t('MACROS.ERROR'));
    }
}

export interface MacroExecution {
    executingMacroId: number | null;
    execute: (macro: Macro, conversationId: number) => Promise<void>;
}

export function useMacroExecution(accountId: number): MacroExecution {
    const [executingMacroId, setExecutingMacroId] = useState<number | null>(null);

    const execute = async (macro: Macro, conversationId: number) => {
        setExecutingMacroId(macro.id);
        try {
            await runMacro(accountId, macro, conversationId);
        } finally {
            setExecutingMacroId(null);
        }
    };

    return { executingMacroId, execute };
}
