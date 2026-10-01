import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AccordionItem from './AccordionItem';

// ContactPanel gốc: `isContactSidebarItemOpen = key => !!uiSettings[key]` → thiếu
// key = ĐÓNG (icon "+", không thân). Mở = icon "−" + thân.
describe('AccordionItem', () => {
    it('renders closed with the add icon and no body', () => {
        const { container, queryByText } = render(
            <AccordionItem title="Conversation Actions" isOpen={false} onToggle={() => undefined}>
                <span>body</span>
            </AccordionItem>,
        );

        expect(queryByText('body')).toBeNull();
        expect(container.querySelector('button')).not.toHaveClass('rounded-bl-none');
        expect(container.querySelector('.i-lucide-plus')).not.toBeNull();
    });

    it('renders open with the subtract icon and the body', () => {
        const { container, getByText } = render(
            <AccordionItem title="Conversation Actions" isOpen onToggle={() => undefined}>
                <span>body</span>
            </AccordionItem>,
        );

        expect(getByText('body')).toBeInTheDocument();
        expect(container.querySelector('button')).toHaveClass('rounded-bl-none');
        expect(container.querySelector('.i-lucide-minus')).not.toBeNull();
    });
});
