import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';

import AccountSettingsIndex from './Index';

const patchJson = vi.fn();

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            currentAccount: { id: 3, locale: 'en' },
            availableLocales: [
                { name: 'English', iso_639_1_code: 'en' },
                { name: 'Tiếng Việt', iso_639_1_code: 'vi' },
            ],
        },
    }),
}));
vi.mock('../../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../BaseSettingsHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('dashboard/helper/apiClient', () => ({ patchJson: (...args: unknown[]) => patchJson(...args) }));

const LOCALE_SAVED_FLAG = 'yona:account-locale-saved';
const toasts: string[] = [];
const collectToast = (payload: unknown) => toasts.push((payload as { message: string }).message);

beforeEach(() => {
    toasts.length = 0;
    patchJson.mockReset();
    window.sessionStorage.clear();
    emitter.on(BUS_EVENTS.SHOW_TOAST, collectToast);
});

afterEach(() => {
    emitter.off(BUS_EVENTS.SHOW_TOAST, collectToast);
    vi.unstubAllGlobals();
});

describe('Cài đặt tài khoản, ô Ngôn ngữ', () => {
    it('chữ "Language" chỉ hiện một lần và vẫn là nhãn của ô chọn', () => {
        render(<AccountSettingsIndex />);

        expect(screen.getAllByText('Language')).toHaveLength(1);
        expect(screen.getByLabelText('Language')).toHaveValue('en');
    });

    it('lưu xong thì ghi cờ rồi tải lại trang, thông báo thành công để dành cho lần tải sau', async () => {
        const reload = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload });
        patchJson.mockResolvedValue({});
        render(<AccountSettingsIndex />);

        await act(async () => fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'vi' } }));

        expect(patchJson).toHaveBeenCalledWith('/api/v1/accounts/3', { locale: 'vi' });
        expect(window.sessionStorage.getItem(LOCALE_SAVED_FLAG)).not.toBeNull();
        expect(reload).toHaveBeenCalledTimes(1);
        expect(toasts).toHaveLength(0);
    });

    it('trang mở lại sau khi lưu thì hiện thông báo thành công đúng một lần', () => {
        window.sessionStorage.setItem(LOCALE_SAVED_FLAG, '1');

        render(<AccountSettingsIndex />);

        expect(toasts).toStrictEqual(['Account language updated']);
        expect(window.sessionStorage.getItem(LOCALE_SAVED_FLAG)).toBeNull();
    });
});
