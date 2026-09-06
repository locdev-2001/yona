import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SettingsSubPageHeader from 'dashboard/settings/SettingsSubPageHeader';

import SanitizedHtml from './SanitizedHtml';

// `v-dompurify-html`: render HTML thật nhưng đã lọc.
describe('SanitizedHtml', () => {
    it('renders the markup instead of escaping it', () => {
        const { container } = render(<SanitizedHtml as="p" html="Hi <br> <b>PS:</b> read this" />);

        expect(container.querySelector('p > b')?.textContent).toBe('PS:');
        expect(container.querySelector('p > br')).not.toBeNull();
    });

    it('strips scripts and event handlers', () => {
        const { container } = render(
            <SanitizedHtml html={'<img src=x onerror="alert(1)"><script>alert(2)</script>ok'} />,
        );

        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('img')?.getAttribute('onerror')).toBeNull();
        expect(container.textContent).toContain('ok');
    });

    it('renders the settings sub page description as markup', () => {
        const { container } = render(
            <SettingsSubPageHeader headerTitle="Agents" headerContent="line one<br><b>PS:</b> note" />,
        );

        expect(container.querySelector('p > b')?.textContent).toBe('PS:');
    });
});
