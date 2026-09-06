import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MacroProperties from './MacroProperties';

// Port từ settings/macros/specs/MacroProperties.spec.js
const renderProperties = (props: Partial<Parameters<typeof MacroProperties>[0]> = {}) => {
    const onVisibilityChange = vi.fn();
    const result = render(
        <MacroProperties
            macroName="Close conversation"
            macroVisibility="personal"
            onNameChange={() => undefined}
            onVisibilityChange={onVisibilityChange}
            onSubmit={() => undefined}
            {...props}
        />,
    );
    const [publicButton, privateButton] = result.container.querySelectorAll('button');
    return { ...result, onVisibilityChange, publicButton, privateButton };
};

describe('MacroProperties', () => {
    it('allows administrators to select public visibility', () => {
        const { publicButton, onVisibilityChange } = renderProperties({ canManagePublicMacros: true });

        publicButton.click();

        expect(publicButton).not.toBeDisabled();
        expect(onVisibilityChange).toHaveBeenCalledWith('global');
    });

    it('disables public visibility for agents with helper copy', () => {
        const { publicButton, onVisibilityChange, container } = renderProperties({ canManagePublicMacros: false });

        publicButton.click();

        expect(publicButton).toBeDisabled();
        expect(onVisibilityChange).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Only administrators can create public macros.');
    });

    it('keeps existing public macros visibly selected when public is disabled', () => {
        const { container } = renderProperties({ canManagePublicMacros: false, macroVisibility: 'global' });

        expect(container.querySelector('.i-lucide-circle-check-big')).not.toBeNull();
    });

    it('shows existing public macros as read-only for agents', () => {
        const { publicButton, privateButton, onVisibilityChange, container } = renderProperties({
            canManagePublicMacros: false,
            macroVisibility: 'global',
            readOnly: true,
        });

        privateButton.click();

        expect(publicButton).toBeDisabled();
        expect(privateButton).toBeDisabled();
        expect(onVisibilityChange).not.toHaveBeenCalled();
        expect(container.textContent).toContain('Only administrators can edit public macros.');
    });
});
