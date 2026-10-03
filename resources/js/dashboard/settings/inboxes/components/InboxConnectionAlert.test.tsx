import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import InboxConnectionAlert from './InboxConnectionAlert';

describe('cảnh báo kết nối hộp thư', () => {
    it('lỗi mạng hiện lời nhắn tự thử lại và không yêu cầu cấp quyền lại', () => {
        render(<InboxConnectionAlert inbox={{ reauthorization_required: false, connection_error: 'Đồng bộ gián đoạn, Yona sẽ tự thử lại.', reconnect_url: '/reconnect' }} onFixSettings={() => {}} />);

        expect(screen.getByRole('alert').textContent).toContain('Yona sẽ tự thử lại');
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('lỗi xác thực vẫn có đường kết nối lại', () => {
        render(<InboxConnectionAlert inbox={{ reauthorization_required: true, connection_error: 'Sai thông tin đăng nhập.', reconnect_url: '/reconnect' }} />);

        expect(screen.getByRole('link').getAttribute('href')).toBe('/reconnect');
    });

    it('đã phục hồi thì không còn cảnh báo', () => {
        render(<InboxConnectionAlert inbox={{ reauthorization_required: false, connection_error: null }} />);

        expect(screen.queryByRole('alert')).toBeNull();
    });
});
