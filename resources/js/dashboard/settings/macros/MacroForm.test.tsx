import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import MacroForm from './MacroForm';
import { newMacroAction } from './macroHelper';
import type { MacroDraft, MacroOptionSets } from './types';

const optionSets: MacroOptionSets = {
    agents: [{ id: 1, name: 'John' }],
    teams: [{ id: 2, name: 'support' }],
    labels: [{ id: 'billing', name: 'billing' }],
};

// MacroForm là component controlled: cha giữ state như MacroEditor thật.
function ControlledForm({ onDraftChange }: { onDraftChange: (macro: MacroDraft) => void }) {
    const [macro, setMacro] = useState<MacroDraft>({ name: '', visibility: 'global', actions: [newMacroAction()] });
    return (
        <MacroForm
            macro={macro}
            optionSets={optionSets}
            uiSettings={{}}
            onChange={next => {
                setMacro(next);
                onDraftChange(next);
            }}
            onSubmit={() => undefined}
        />
    );
}

describe('MacroForm', () => {
    it('giữ loại action vừa chọn khi cha là controlled component', () => {
        const drafts: MacroDraft[] = [];
        render(<ControlledForm onDraftChange={next => drafts.push(next)} />);

        fireEvent.click(screen.getByText('Assign a Team'));
        fireEvent.click(screen.getByText('Add a Label'));

        const draft = drafts.at(-1);
        expect(draft?.actions[0].action_name).toBe('add_label');
        expect(draft?.actions[0].action_params).toEqual([]);
        expect(screen.getByText('Add a Label')).toBeTruthy();
    });
});
