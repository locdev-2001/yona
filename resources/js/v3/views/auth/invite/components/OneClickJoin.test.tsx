import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@inertiajs/react', () => ({ router: { post } }));

import { setLocale } from '../../../../../i18n';
import OneClickJoin from './OneClickJoin';

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

afterEach(() => {
    vi.clearAllMocks();
});

describe('OneClickJoin', () => {
    it('shows the signed-in email and posts an empty body on click', () => {
        render(<OneClickJoin token="abc123" email="admin@example.com" />);

        expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Tham gia ngay' }));

        expect(post).toHaveBeenCalledWith(
            '/invite/abc123',
            {},
            expect.objectContaining({ onError: expect.any(Function), onFinish: expect.any(Function) }),
        );
    });
});
