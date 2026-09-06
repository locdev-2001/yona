import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import MfaVerification from './MfaVerification';

// Port từ dashboard/components/auth/MfaVerification.spec.js — Chatwoot gọi axios
// trong component, bản React đẩy việc gửi lên trang đăng nhập nên assert callback.

function renderComponent(onVerify = vi.fn()) {
    render(
        <MfaVerification isVerifying={false} errorMessage="" onVerify={onVerify} onCancel={vi.fn()} />,
    );
    return onVerify;
}

describe('MfaVerification', () => {
    it('submits automatically once six digits are entered', () => {
        const onVerify = renderComponent();
        const inputs = document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]');

        '123456'.split('').forEach((digit, index) => {
            fireEvent.change(inputs[index], { target: { value: digit } });
        });

        expect(onVerify).toHaveBeenCalledWith({ otpCode: '123456' });
    });

    it('ignores non numeric input', () => {
        const onVerify = renderComponent();
        const inputs = document.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]');

        fireEvent.change(inputs[0], { target: { value: 'a' } });

        expect(inputs[0].value).toBe('');
        expect(onVerify).not.toHaveBeenCalled();
    });

    it('switches to the backup code method and submits it', () => {
        const onVerify = renderComponent();

        fireEvent.click(screen.getByRole('button', { name: 'Backup Code' }));
        const backupInput = document.querySelector<HTMLInputElement>('input[name="backup_code"]')!;
        fireEvent.change(backupInput, { target: { value: 'ABCD1234' } });
        fireEvent.click(screen.getByTestId('submit_button'));

        expect(onVerify).toHaveBeenCalledWith({ backupCode: 'ABCD1234' });
    });

    it('shows the error message returned by the server', () => {
        render(
            <MfaVerification
                isVerifying={false}
                errorMessage="Invalid verification code"
                onVerify={vi.fn()}
                onCancel={vi.fn()}
            />,
        );

        expect(screen.getByText('Invalid verification code')).toBeInTheDocument();
    });
});
