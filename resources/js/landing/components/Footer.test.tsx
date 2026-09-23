import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { landingConfigFixture } from '../test-support/landingConfigFixture';
import { Footer } from './Footer';

describe('Footer', () => {
    it('có cột Pháp lý trỏ vào hai trang pháp lý', () => {
        const config = landingConfigFixture('home');
        render(<Footer config={config} />);

        const legal = screen.getByText(config.legalNav.heading).closest('nav') as HTMLElement;

        expect(within(legal).getByRole('link', { name: config.legalNav.terms })).toHaveAttribute('href', config.urls.terms);
        expect(within(legal).getByRole('link', { name: config.legalNav.privacy })).toHaveAttribute(
            'href',
            config.urls.privacy,
        );
    });
});
