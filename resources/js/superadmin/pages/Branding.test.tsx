import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const post = vi.fn();
const destroy = vi.fn();
let pageProps: Record<string, unknown> = {};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    usePage: () => ({ props: pageProps }),
    router: {
        post: (...args: unknown[]) => post(...args),
        delete: (...args: unknown[]) => destroy(...args),
    },
}));

import { installDomStubs } from '../components/__fixtures__/dom';
import { superAdminProps } from '../components/__fixtures__/superAdmin';
import Branding from './Branding';
import type { BrandAsset } from './Branding';

const strings = {
    title: 'Thương hiệu',
    description: 'Logo, biểu tượng và favicon.',
    upload: 'Tải ảnh lên',
    replace: 'Thay ảnh',
    uploading: 'Đang tải lên…',
    reset: 'Về mặc định',
    reset_confirm_title: 'Về ảnh mặc định?',
    reset_confirm_description: 'Ảnh đã tải lên bị xoá.',
    using_custom: 'Đang dùng ảnh đã tải lên',
    using_default: 'Đang dùng tệp mặc định',
    preview_alt: 'Xem trước {name}',
};

const asset = (overrides: Partial<BrandAsset>): BrandAsset => ({
    slot: 'logo',
    title: 'Logo',
    description: 'Logo đầy đủ.',
    url: '/brand-assets/logo.png',
    isCustom: false,
    accept: '.png,.svg',
    requirements: 'Định dạng PNG, SVG, tối đa 2 MB.',
    ...overrides,
});

const slotRow = (slot: string): HTMLElement => document.querySelector(`[data-slot="${slot}"]`) as HTMLElement;

describe('Màn Thương hiệu của console', () => {
    beforeEach(() => {
        installDomStubs();
        post.mockReset();
        destroy.mockReset();
        pageProps = { superAdmin: superAdminProps(), errors: {} };
    });

    it('chọn tệp là tải lên đúng ô dưới dạng form-data', () => {
        render(<Branding assets={[asset({}), asset({ slot: 'favicon', title: 'Favicon', url: '/favicon.ico' })]} strings={strings} />);
        const file = new File(['icon'], 'favicon.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('Favicon'), { target: { files: [file] } });

        expect(post).toHaveBeenCalledWith('/admin/branding/favicon', { file }, expect.objectContaining({ forceFormData: true }));
    });

    it('ô đang dùng ảnh riêng có nút về mặc định, xác nhận xong mới xoá', () => {
        render(<Branding assets={[asset({ isCustom: true, url: '/storage/branding/logo-abc.png' })]} strings={strings} />);
        const row = within(slotRow('logo'));

        expect(row.getByText('Đang dùng ảnh đã tải lên')).toBeTruthy();
        expect(row.getByRole('img').getAttribute('src')).toBe('/storage/branding/logo-abc.png');

        fireEvent.click(row.getByRole('button', { name: /Về mặc định/ }));
        expect(destroy).not.toHaveBeenCalled();
        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Về mặc định' }));

        expect(destroy).toHaveBeenCalledWith('/admin/branding/logo', expect.anything());
    });

    it('ô dùng tệp mặc định không có nút về mặc định', () => {
        render(<Branding assets={[asset({})]} strings={strings} />);

        expect(within(slotRow('logo')).queryByRole('button', { name: /Về mặc định/ })).toBeNull();
        expect(within(slotRow('logo')).getByText('Đang dùng tệp mặc định')).toBeTruthy();
    });
});
