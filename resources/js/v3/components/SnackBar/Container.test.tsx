import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAlert } from 'dashboard/composables/useAlert';

import SnackbarContainer from './Container';

// Trang nằm trước khung thông báo trong cây (như Dashboard: nội dung trang rồi mới tới
// SnackbarContainer) và báo ngay khi dựng.
function PageAlertingOnMount({ message }: { message: string }) {
    useEffect(() => useAlert(message), [message]);

    return null;
}

describe('khung thông báo của dashboard', () => {
    it('hiện thông báo trang bắn ngay lúc dựng, kể cả khi trang đứng trước khung trong cây', () => {
        render(
            <>
                <PageAlertingOnMount message="Đã đổi ngôn ngữ tài khoản" />
                <SnackbarContainer />
            </>,
        );

        expect(screen.getByText('Đã đổi ngôn ngữ tài khoản')).toBeInTheDocument();
    });
});
