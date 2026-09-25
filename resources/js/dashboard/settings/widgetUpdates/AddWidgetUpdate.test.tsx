import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import type { WidgetUpdate } from './types';

// Locale mặc định của bundle test là `en`; sản phẩm chạy tiếng Việt.
beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 7 } } }),
}));

const { getJson } = vi.hoisted(() => ({ getJson: vi.fn() }));
vi.mock('dashboard/helper/apiClient', () => ({
    getJson,
    postJson: vi.fn(),
    patchJson: vi.fn(),
    deleteJson: vi.fn(),
    parseApiErrorMessage: () => null,
}));

vi.mock('dashboard/composables/useAlert', () => ({ useAlert: vi.fn() }));

const { createWidgetUpdate, publishWidgetUpdate } = vi.hoisted(() => ({
    createWidgetUpdate: vi.fn(),
    publishWidgetUpdate: vi.fn(),
}));
vi.mock('./api', () => ({ createWidgetUpdate, publishWidgetUpdate }));

const { default: AddWidgetUpdate } = await import('./AddWidgetUpdate');

const draftUpdate: WidgetUpdate = {
    id: 1,
    title: 'Giảm giá cuối tuần',
    body: null,
    tag: 'notice',
    cover_url: null,
    cta_label: null,
    cta_url: null,
    inbox: null,
    published: false,
    published_at: null,
};

beforeEach(() => {
    getJson.mockResolvedValue({ payload: [] });
});

afterEach(() => {
    vi.clearAllMocks();
});

// "Lưu nháp" và "Đăng" phải gửi đúng payload/hành động: nháp chỉ tạo bài, đăng
// phải tạo bài RỒI gọi publish ngay (store/update không tự set published_at).
describe('AddWidgetUpdate', () => {
    it('Lưu nháp chỉ gọi tạo bài, không đăng', async () => {
        createWidgetUpdate.mockResolvedValue(draftUpdate);
        const onCreated = vi.fn();

        render(<AddWidgetUpdate accountId={7} onClose={vi.fn()} onCreated={onCreated} />);

        fireEvent.change(screen.getByTestId('widget-update-title'), { target: { value: 'Giảm giá cuối tuần' } });
        fireEvent.click(screen.getByTestId('save-draft-btn'));

        await waitFor(() => expect(onCreated).toHaveBeenCalledWith(draftUpdate));
        expect(createWidgetUpdate).toHaveBeenCalledTimes(1);
        expect(createWidgetUpdate).toHaveBeenCalledWith(
            7,
            expect.objectContaining({ title: 'Giảm giá cuối tuần', tag: 'notice' }),
        );
        expect(publishWidgetUpdate).not.toHaveBeenCalled();
    });

    it('Đăng tạo bài rồi gọi publish ngay bằng id vừa tạo', async () => {
        const published = { ...draftUpdate, id: 2, published: true, published_at: 1_700_000_000 };
        createWidgetUpdate.mockResolvedValue({ ...draftUpdate, id: 2 });
        publishWidgetUpdate.mockResolvedValue(published);
        const onCreated = vi.fn();

        render(<AddWidgetUpdate accountId={7} onClose={vi.fn()} onCreated={onCreated} />);

        fireEvent.change(screen.getByTestId('widget-update-title'), { target: { value: 'Giảm giá cuối tuần' } });
        fireEvent.click(screen.getByTestId('publish-btn'));

        await waitFor(() => expect(publishWidgetUpdate).toHaveBeenCalledWith(7, 2));
        expect(createWidgetUpdate).toHaveBeenCalledTimes(1);
        expect(onCreated).toHaveBeenCalledWith(published);
    });

    it('không gửi gì khi tiêu đề còn trống', () => {
        render(<AddWidgetUpdate accountId={7} onClose={vi.fn()} onCreated={vi.fn()} />);

        fireEvent.click(screen.getByTestId('save-draft-btn'));

        expect(createWidgetUpdate).not.toHaveBeenCalled();
    });
});
