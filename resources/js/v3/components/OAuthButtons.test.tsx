import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getLocale, setLocale } from '../../i18n';
import OAuthButtons from './OAuthButtons';

describe('nút đăng nhập bằng nhà cung cấp OAuth', () => {
    const previousLocale = getLocale();
    beforeAll(() => setLocale('vi'));
    afterAll(() => setLocale(previousLocale));

    it('không hiện gì khi máy chủ chưa cấu hình nhà cung cấp nào', () => {
        const { container } = render(<OAuthButtons providers={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('bỏ qua nhà cung cấp mà giao diện chưa biết', () => {
        const { container } = render(<OAuthButtons providers={['github']} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('Google đã cấu hình thì có nút đi thẳng tới route OAuth, không qua router', () => {
        render(<OAuthButtons providers={['google']} />);

        const button = screen.getByTestId('oauth_google');
        expect(button.tagName).toBe('A');
        expect(button).toHaveAttribute('href', '/app/auth/oauth/google');
        expect(button).toHaveTextContent('Tiếp tục với Google');
    });

    it('lỗi của lượt quay về hiện ngay dưới nút', () => {
        render(<OAuthButtons providers={['google']} error="Chưa đăng nhập được. Bạn hãy thử lại." />);

        expect(screen.getByRole('alert')).toHaveTextContent('Chưa đăng nhập được. Bạn hãy thử lại.');
    });
});
