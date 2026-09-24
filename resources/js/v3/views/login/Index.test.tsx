import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type PostOptions = { onError?: (errors: Record<string, string>) => void };

const post = vi.fn<(url: string, payload: Record<string, unknown>, options: PostOptions) => void>();
const useAlert = vi.fn();

vi.mock('@inertiajs/react', () => ({
    router: { post: (url: string, payload: Record<string, unknown>, options: PostOptions) => post(url, payload, options) },
    usePage: () => ({ props: { errors: {}, globalConfig: { installationName: 'Yona' } } }),
}));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert: (message: string) => useAlert(message) }));

import LoginIndex from './Index';

const PAGE_EXPIRED_MESSAGE = 'Trang đã mở quá lâu nên cần làm mới. Bạn thử lại nhé.';

function submitCredentials() {
    render(<LoginIndex />);
    fireEvent.change(screen.getByTestId('email_input'), { target: { value: 'lan@shop.vn' } });
    fireEvent.change(screen.getByTestId('password_input'), { target: { value: 'Password1!' } });
    fireEvent.click(screen.getByTestId('submit_button'));
}

const lastPostOptions = () => post.mock.calls[post.mock.calls.length - 1][2];

describe('đăng nhập khi trang đã để mở quá lâu', () => {
    beforeEach(() => {
        post.mockReset();
        useAlert.mockReset();
    });

    it('tự gửi lại một lần với cùng thông tin, không báo lỗi', () => {
        submitCredentials();
        lastPostOptions().onError?.({ page_expired: PAGE_EXPIRED_MESSAGE });

        expect(post).toHaveBeenCalledTimes(2);
        expect(post.mock.calls[1][1]).toEqual(post.mock.calls[0][1]);
        expect(post.mock.calls[1][1]).toEqual({ email: 'lan@shop.vn', password: 'Password1!' });
        expect(useAlert).not.toHaveBeenCalled();
    });

    it('lần gửi lại vẫn hết hạn thì báo đúng thông điệp đó, không gửi thêm', () => {
        submitCredentials();
        lastPostOptions().onError?.({ page_expired: PAGE_EXPIRED_MESSAGE });
        lastPostOptions().onError?.({ page_expired: PAGE_EXPIRED_MESSAGE });

        expect(post).toHaveBeenCalledTimes(2);
        expect(useAlert).toHaveBeenCalledWith(PAGE_EXPIRED_MESSAGE);
    });

    it('sai mật khẩu vẫn báo lỗi như cũ, không gửi lại', () => {
        submitCredentials();
        lastPostOptions().onError?.({ email: 'Thông tin đăng nhập không đúng.' });

        expect(post).toHaveBeenCalledTimes(1);
        expect(useAlert).toHaveBeenCalledWith('Thông tin đăng nhập không đúng.');
    });
});
