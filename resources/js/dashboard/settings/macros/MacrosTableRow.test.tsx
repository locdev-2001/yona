import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MacrosTableRow from './MacrosTableRow';
import type { Macro, MacroVisibility } from './types';

// Port từ settings/macros/specs/MacrosTableRow.spec.js. Link của Inertia cần
// router thật nên thay bằng thẻ <a> — spec gốc cũng stub RouterLink như vậy.
vi.mock('@inertiajs/react', () => ({
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const macro = (visibility: MacroVisibility): Macro =>
    ({
        id: 1,
        account_id: 2,
        name: 'Close conversation',
        visibility,
        actions: [],
        created_by: { id: 3, available_name: 'Maya Chen', email: 'maya.chen@example.com' },
        updated_by: { id: 3, available_name: 'Maya Chen', email: 'maya.chen@example.com' },
    }) as Macro;

const renderRow = (props: Partial<Parameters<typeof MacrosTableRow>[0]> = {}) =>
    render(
        <table>
            <tbody>
                <MacrosTableRow
                    macro={macro('global')}
                    accountId={2}
                    canManagePublicMacros
                    onDelete={() => undefined}
                    {...props}
                />
            </tbody>
        </table>,
    );

describe('MacrosTableRow', () => {
    it('shows actions for public macros when public macros can be managed', () => {
        const { container } = renderRow();

        expect(container.querySelectorAll('button')).toHaveLength(2);
    });

    it('keeps public macros viewable without delete actions when public macros cannot be managed', () => {
        const { container } = renderRow({ canManagePublicMacros: false });

        expect(container.querySelectorAll('button')).toHaveLength(1);
        expect(container.querySelector('button')).toHaveAttribute('title', 'View macro');
    });

    it('keeps actions available for personal macros when public macros cannot be managed', () => {
        const { container } = renderRow({ macro: macro('personal'), canManagePublicMacros: false });

        expect(container.querySelectorAll('button')).toHaveLength(2);
    });

    it('falls back to the email when the author has no name', () => {
        const withoutName = { ...macro('global'), created_by: { id: 3, email: 'maya.chen@example.com' } };
        const { container } = renderRow({ macro: withoutName as Macro });

        expect(container.textContent).toContain('maya.chen@example.com');
    });
});
