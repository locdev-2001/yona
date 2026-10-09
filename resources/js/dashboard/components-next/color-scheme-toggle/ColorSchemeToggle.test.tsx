import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import { setLocale, t } from '../../../i18n';

const { putJson, reload } = vi.hoisted(() => ({ putJson: vi.fn(), reload: vi.fn() }));
vi.mock('dashboard/helper/apiClient', () => ({ putJson }));
vi.mock('@inertiajs/react', () => ({
    router: { reload },
    usePage: () => ({ props: { auth: { user: { id: 1, ui_settings: {} } } } }),
}));

import ColorSchemeToggle from './ColorSchemeToggle';

const toasts: string[] = [];
const collectToast = (payload: unknown) => toasts.push((payload as { message: string }).message);
const option = (key: 'LIGHT' | 'DARK') =>
    screen.getByRole('radio', { name: t(`PROFILE_SETTINGS.FORM.INTERFACE_SECTION.COLOR_SCHEME.OPTIONS.${key}`) });

describe('Công tắc Sáng / Tối', () => {
    beforeEach(() => {
        setLocale('vi');
        putJson.mockReset();
        reload.mockReset();
        toasts.length = 0;
        emitter.on(BUS_EVENTS.SHOW_TOAST, collectToast);
    });

    afterEach(() => {
        emitter.off(BUS_EVENTS.SHOW_TOAST, collectToast);
        document.documentElement.classList.remove('dark');
    });

    it('gạt sang Tối thì portal tối ngay và lưu lựa chọn', async () => {
        putJson.mockResolvedValue({});
        render(<ColorSchemeToggle />);
        expect(option('LIGHT')).toHaveAttribute('aria-checked', 'true');

        await act(async () => fireEvent.click(option('DARK')));

        expect(option('DARK')).toHaveAttribute('aria-checked', 'true');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(putJson).toHaveBeenCalledWith('/api/v1/profile', { ui_settings: { color_scheme: 'dark' } });
    });

    it('lưu hỏng thì gạt về Sáng và báo lỗi', async () => {
        putJson.mockRejectedValue(new Error('500'));
        render(<ColorSchemeToggle />);

        await act(async () => fireEvent.click(option('DARK')));

        expect(option('LIGHT')).toHaveAttribute('aria-checked', 'true');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(toasts).toContain(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.COLOR_SCHEME.UPDATE_ERROR'));
    });
});
