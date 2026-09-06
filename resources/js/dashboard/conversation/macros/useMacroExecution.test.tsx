import { act } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Macro } from 'dashboard/settings/macros/types';
import { useMacroExecution } from './useMacroExecution';

// Port từ composables/spec/useMacroExecution.spec.js. Nhánh "thuộc tính bắt buộc
// khi resolve" của gốc không port (tính năng trả phí, xem useMacroExecution.ts)
// nên các case liên quan bị lược; phần còn lại giữ nguyên kỳ vọng.
const executeMacro = vi.hoisted(() => vi.fn());
const useAlert = vi.hoisted(() => vi.fn());

vi.mock('dashboard/settings/macros/macrosStore', () => ({ executeMacro }));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert }));

const ACCOUNT_ID = 2;
const CONVERSATION_ID = 42;

const macroWith = (actions: Macro['actions']) => ({ id: 7, name: 'Test macro', actions }) as Macro;
const addLabel = { action_name: 'add_label', action_params: ['spam'] };

let api: ReturnType<typeof useMacroExecution>;

function Probe({ accountId }: { accountId: number }) {
    api = useMacroExecution(accountId);
    return <span>{api.executingMacroId ?? 'idle'}</span>;
}

describe('useMacroExecution', () => {
    beforeEach(() => {
        executeMacro.mockReset().mockResolvedValue(undefined);
        useAlert.mockClear();
        render(<Probe accountId={ACCOUNT_ID} />);
    });

    it('runs the macro against the conversation', async () => {
        await act(() => api.execute(macroWith([addLabel]), CONVERSATION_ID));

        expect(executeMacro).toHaveBeenCalledWith(ACCOUNT_ID, 7, [CONVERSATION_ID]);
        expect(useAlert).toHaveBeenCalledWith('Macro executed successfully');
    });

    it('clears the running macro once it settles', async () => {
        await act(() => api.execute(macroWith([addLabel]), CONVERSATION_ID));

        expect(api.executingMacroId).toBeNull();
    });

    it('alerts when the macro fails to run', async () => {
        executeMacro.mockRejectedValueOnce(new Error('boom'));

        await act(() => api.execute(macroWith([addLabel]), CONVERSATION_ID));

        expect(useAlert).toHaveBeenCalledWith('Something went wrong. Please try again');
        expect(api.executingMacroId).toBeNull();
    });
});
