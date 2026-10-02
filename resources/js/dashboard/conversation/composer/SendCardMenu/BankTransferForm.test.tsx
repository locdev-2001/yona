import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../../i18n';

const { getJson, postJson } = vi.hoisted(() => ({ getJson: vi.fn(), postJson: vi.fn() }));
vi.mock('dashboard/helper/apiClient', () => ({ getJson, postJson, parseApiErrorMessage: () => '' }));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert: vi.fn() }));
vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { currentAccountUser: { role: 'administrator' } } }) }));

import BankTransferForm from './BankTransferForm';
import type { BankTransferDraft, StructuredDraft } from './cardPayloads';

const BANKS = [
    { bin: '970403', code: 'STB', short_name: 'Sacombank', name: 'Sacombank' },
    { bin: '970432', code: 'VPB', short_name: 'VPBank', name: 'VPBank' },
];

function Harness({ onPreview }: { onPreview: (preview: StructuredDraft | null) => void }) {
    const [draft, setDraft] = useState<BankTransferDraft>({ paymentAccountId: null, amount: '', memo: '' });

    return (
        <>
            <BankTransferForm accountId={2} conversationDisplayId={214} draft={draft} onChange={setDraft} onPreview={onPreview} />
            <output data-testid="selected-account">{draft.paymentAccountId ?? ''}</output>
        </>
    );
}

const chooseBank = (current: string, label: string) => {
    fireEvent.click(screen.getByRole('button', { name: current }));
    fireEvent.click(screen.getByText(label));
};

beforeEach(() => {
    vi.useFakeTimers();
    setLocale('vi');
    getJson.mockImplementation((url: string) => {
        if (url.endsWith('/payment_accounts')) return Promise.resolve({ payload: [] });
        if (url.endsWith('/payment_accounts/banks')) return Promise.resolve({ payload: BANKS });
        return Promise.resolve({ qr_payload: `QR:${url}` });
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

const VIETINBANK = { id: 5, bank_bin: '970415', bank_code: 'ICB', bank_name: 'VietinBank', account_number: '0123456789', account_name: 'HKD GOM MOC', memo_template: null, is_default: true };

describe('BankTransferForm — quản trị viên tạo nhanh tài khoản nhận tiền', () => {
    it('đang tạo thì bỏ chọn tài khoản cũ để nút Gửi không gửi nhầm; huỷ thì chọn lại', async () => {
        getJson.mockImplementation((url: string) => {
            if (url.endsWith('/payment_accounts')) return Promise.resolve({ payload: [VIETINBANK] });
            if (url.endsWith('/payment_accounts/banks')) return Promise.resolve({ payload: BANKS });
            return Promise.resolve({ qr_payload: 'QR' });
        });
        render(<Harness onPreview={vi.fn()} />);
        await act(async () => {});
        expect(screen.getByTestId('selected-account')).toHaveTextContent('5');

        const accountLabel = 'VietinBank · 0123456789 · HKD GOM MOC';
        fireEvent.click(screen.getByRole('button', { name: accountLabel }));
        fireEvent.click(screen.getByText(t('CONVERSATION.SEND_CARD.BANK_TRANSFER.ADD_ACCOUNT')));
        expect(screen.getByTestId('selected-account')).toBeEmptyDOMElement();

        fireEvent.click(screen.getByRole('button', { name: t('PAYMENT_ACCOUNTS.FORM.CANCEL') }));
        expect(screen.getByTestId('selected-account')).toHaveTextContent('5');
        expect(screen.getByRole('button', { name: accountLabel })).toBeInTheDocument();
    });

    it('xem trước đi theo ô đang gõ; đổi ngân hàng giữ nguyên số tài khoản đã nhập', async () => {
        const onPreview = vi.fn();
        render(<Harness onPreview={onPreview} />);
        await act(async () => {});

        chooseBank(t('PAYMENT_ACCOUNTS.FORM.BANK.PLACEHOLDER'), 'STB · Sacombank');
        fireEvent.change(screen.getByPlaceholderText(t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NUMBER.PLACEHOLDER')), { target: { value: '0601234567' } });
        await act(async () => vi.advanceTimersByTime(300));

        expect(getJson).toHaveBeenCalledWith(expect.stringContaining('/payment_accounts/preview?bank_bin=970403&account_number=0601234567&memo=CK+nhanh+qua+Yona'));
        expect(onPreview).toHaveBeenLastCalledWith(
            expect.objectContaining({ contentAttributes: expect.objectContaining({ bank_bin: '970403', bank_name: 'Sacombank', account_name: '…', memo: 'CK nhanh qua Yona' }) }),
        );

        chooseBank('STB · Sacombank', 'VPB · VPBank');
        fireEvent.change(screen.getByPlaceholderText(t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NAME.PLACEHOLDER')), { target: { value: 'Nguyễn Văn Bình' } });
        await act(async () => vi.advanceTimersByTime(300));

        expect(screen.getByPlaceholderText(t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NUMBER.PLACEHOLDER'))).toHaveValue('0601234567');
        expect(onPreview).toHaveBeenLastCalledWith(
            expect.objectContaining({ contentAttributes: expect.objectContaining({ bank_bin: '970432', account_name: 'NGUYEN VAN BINH' }) }),
        );
    });

    it('tạo xong thì chọn luôn tài khoản mới, không gửi thẻ', async () => {
        postJson.mockResolvedValue({ id: 9, bank_bin: '970403', bank_code: 'STB', bank_name: 'Sacombank', account_number: '0601234567', account_name: 'NGUYEN VAN BINH', memo_template: '{ma_hoi_thoai}', is_default: true, allow_all_agents: true });
        render(<Harness onPreview={vi.fn()} />);
        await act(async () => {});

        chooseBank(t('PAYMENT_ACCOUNTS.FORM.BANK.PLACEHOLDER'), 'STB · Sacombank');
        fireEvent.change(screen.getByPlaceholderText(t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NUMBER.PLACEHOLDER')), { target: { value: '0601234567' } });
        fireEvent.change(screen.getByPlaceholderText(t('PAYMENT_ACCOUNTS.FORM.ACCOUNT_NAME.PLACEHOLDER')), { target: { value: 'Nguyen Van Binh' } });
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: t('PAYMENT_ACCOUNTS.FORM.CREATE') }));
        });

        expect(postJson).toHaveBeenCalledWith('/api/v1/accounts/2/payment_accounts', expect.objectContaining({ bank_bin: '970403', account_number: '0601234567' }));
        expect(screen.getByRole('button', { name: 'Sacombank · 0601234567 · NGUYEN VAN BINH' })).toBeInTheDocument();
    });
});
