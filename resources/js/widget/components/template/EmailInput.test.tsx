import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import EmailInput from './EmailInput';
import { widgetStore } from '../../store/widgetStore';

afterEach(() => vi.restoreAllMocks());

describe('thẻ xin email trong luồng chat', () => {
    it('email sai thì chưa gửi được; email đúng thì lưu vào đúng tin', async () => {
        const update = vi.spyOn(widgetStore, 'updateMessage').mockResolvedValue(true);
        render(<EmailInput title="Nhận thông báo qua email" messageId={42} messageContentAttributes={{}} />);

        const field = screen.getByLabelText('Email');
        const send = screen.getByRole('button', { name: 'Send' });
        fireEvent.change(field, { target: { value: 'ban@' } });
        expect((send as HTMLButtonElement).disabled).toBe(true);

        fireEvent.change(field, { target: { value: 'ban@gommoc.vn' } });
        fireEvent.click(send);

        await waitFor(() => expect(update).toHaveBeenCalledWith({ messageId: 42, email: 'ban@gommoc.vn' }));
    });

    it('lưu lỗi thì báo ngay dưới ô, gắn với ô nhập', async () => {
        vi.spyOn(widgetStore, 'updateMessage').mockResolvedValue(false);
        render(<EmailInput title="Nhận thông báo qua email" messageId={42} messageContentAttributes={{}} />);

        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ban@gommoc.vn' } });
        fireEvent.submit(screen.getByLabelText('Email').closest('form')!);

        const alert = await screen.findByRole('alert');
        expect(screen.getByLabelText('Email').getAttribute('aria-describedby')).toBe(alert.id);
    });

    it('đã để email thì thẻ chuyển sang trạng thái đã nhận, không còn ô nhập', () => {
        render(<EmailInput title="Nhận thông báo qua email" messageId={42} messageContentAttributes={{ submitted_email: 'ban@gommoc.vn' }} />);

        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.getByText(/ban@gommoc\.vn/)).toBeTruthy();
    });
});
