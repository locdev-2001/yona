import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { landingConfigFixture, notFoundFixture } from '../test-support/landingConfigFixture';
import { NotFound } from './NotFound';

describe('NotFound', () => {
    it('đưa khách lạc đường về trang chủ hoặc màn đăng nhập', () => {
        const config = landingConfigFixture('not_found', { notFound: notFoundFixture() });
        render(<NotFound config={config} />);

        expect(screen.getByRole('heading', { level: 1, name: 'Không tìm thấy trang này' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', config.urls.home);
        expect(screen.getByRole('link', { name: config.strings.nav.login })).toHaveAttribute('href', config.urls.login);
    });

    it('người đã đăng nhập thì lối thứ hai là Dashboard', () => {
        const config = landingConfigFixture('not_found', { notFound: notFoundFixture(), isAuthenticated: true });
        render(<NotFound config={config} />);

        expect(screen.getByRole('link', { name: config.strings.nav.dashboard })).toHaveAttribute(
            'href',
            config.urls.dashboard,
        );
        expect(screen.queryByRole('link', { name: config.strings.nav.login })).toBeNull();
    });
});
