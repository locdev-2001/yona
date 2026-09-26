import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CannedResponse as CannedResponseRecord } from 'dashboard/composables/useCannedResponses';

// jsdom không có ResizeObserver — CaretAnchoredPicker (bảng gợi ý `/`) tự đo lại
// kích thước ký tự kích hoạt để neo popup.
class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 7 } } }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const { fetchCannedResponses, useCannedResponses } = vi.hoisted(() => ({
    fetchCannedResponses: vi.fn(),
    useCannedResponses: vi.fn(),
}));
vi.mock('dashboard/composables/useCannedResponses', () => ({ fetchCannedResponses, useCannedResponses }));

import CannedResponse from './CannedResponse';

const RECORDS: CannedResponseRecord[] = [
    { id: 1, short_code: 'chao', content: 'Chào bạn, mình có thể giúp gì?' },
    {
        id: 2,
        short_code: 'ck-tra-truoc',
        content: '',
        content_type: 'bank_transfer',
        content_attributes: { payment_account_id: 9, amount: 480000, memo: 'GM1024' },
    },
];

afterEach(() => {
    vi.clearAllMocks();
});

function renderPicker(overrides: Partial<Parameters<typeof CannedResponse>[0]> = {}) {
    useCannedResponses.mockReturnValue({ records: RECORDS, isFetching: false });
    const onReplace = vi.fn();
    const onSelectCard = vi.fn();
    render(
        <CannedResponse
            caretPosition={{ top: 0, height: 20 }}
            searchKey=""
            schema={null}
            onReplace={onReplace}
            onSelectCard={onSelectCard}
            onClose={vi.fn()}
            onRemoveTrigger={vi.fn()}
            {...overrides}
        />,
    );
    return { onReplace, onSelectCard };
}

describe('CannedResponse — chọn mục trong bảng `/`', () => {
    it('chọn một câu trả lời mẫu chữ thuần thì chèn chữ vào ô soạn', () => {
        const { onReplace, onSelectCard } = renderPicker();

        fireEvent.click(screen.getByText('/chao'));

        expect(onReplace).toHaveBeenCalledWith('Chào bạn, mình có thể giúp gì?');
        expect(onSelectCard).not.toHaveBeenCalled();
    });

    it('chọn một câu trả lời mẫu mang thẻ thì gửi thẻ, không chèn chữ', () => {
        const { onReplace, onSelectCard } = renderPicker();

        fireEvent.click(screen.getByText('/ck-tra-truoc'));

        expect(onReplace).not.toHaveBeenCalled();
        expect(onSelectCard).toHaveBeenCalledWith({
            contentType: 'bank_transfer',
            content: null,
            contentAttributes: { payment_account_id: 9, amount: 480000, memo: 'GM1024' },
        });
    });
});
