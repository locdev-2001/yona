import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import { setLocale, t } from '../../../i18n';

let personalLocale: string | undefined;

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: { user: { id: 7, ui_settings: personalLocale ? { locale: personalLocale } : {} } },
            globalConfig: {
                availableLocales: [
                    { name: 'English', iso_639_1_code: 'en' },
                    { name: 'Tiếng Việt', iso_639_1_code: 'vi' },
                ],
            },
        },
    }),
}));

const { putJson } = vi.hoisted(() => ({ putJson: vi.fn() }));
vi.mock('dashboard/helper/apiClient', () => ({ putJson }));

import { DropdownContainer } from 'dashboard/components-next/dropdown-menu/base';
import SidebarProfileMenuLanguage from './SidebarProfileMenuLanguage';

const toasts: string[] = [];
const collectToast = (payload: unknown) => toasts.push((payload as { message: string }).message);

function openLanguageMenu() {
    render(
        <DropdownContainer menu={<SidebarProfileMenuLanguage />}>{({ toggle }) => <button onClick={toggle}>avatar</button>}</DropdownContainer>,
    );
    fireEvent.click(screen.getByText('avatar'));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${t('SIDEBAR_ITEMS.LANGUAGE')}:`) }));
}

describe('Menu avatar, hàng Ngôn ngữ', () => {
    beforeEach(() => {
        setLocale('vi');
        personalLocale = undefined;
        putJson.mockReset();
        toasts.length = 0;
        emitter.on(BUS_EVENTS.SHOW_TOAST, collectToast);
    });

    afterEach(() => {
        emitter.off(BUS_EVENTS.SHOW_TOAST, collectToast);
        vi.unstubAllGlobals();
    });

    it('chưa tự chọn thì hiện "Theo tài khoản"; chọn Tiếng Việt lưu ngôn ngữ riêng rồi tải lại để giao diện đổi ngay', async () => {
        const reload = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload });
        putJson.mockResolvedValue({});
        openLanguageMenu();

        expect(screen.getByRole('button', { name: `${t('SIDEBAR_ITEMS.LANGUAGE')}: ${t('SIDEBAR_ITEMS.LANGUAGE_ACCOUNT_DEFAULT')}` })).toBeTruthy();
        await act(async () => fireEvent.click(screen.getByText('Tiếng Việt')));

        expect(putJson).toHaveBeenCalledWith('/api/v1/profile', { ui_settings: { locale: 'vi' } });
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('chọn "Theo tài khoản" xoá ngôn ngữ riêng', async () => {
        vi.stubGlobal('location', { ...window.location, reload: vi.fn() });
        personalLocale = 'en';
        putJson.mockResolvedValue({});
        openLanguageMenu();

        await act(async () => fireEvent.click(screen.getByText(t('SIDEBAR_ITEMS.LANGUAGE_ACCOUNT_DEFAULT'))));

        expect(putJson).toHaveBeenCalledWith('/api/v1/profile', { ui_settings: { locale: null } });
    });

    it('lưu lỗi thì báo lỗi, không tải lại trang', async () => {
        const reload = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload });
        putJson.mockRejectedValue(new Error('network'));
        openLanguageMenu();

        await act(async () => fireEvent.click(screen.getByText('English')));

        expect(reload).not.toHaveBeenCalled();
        expect(toasts).toStrictEqual([t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.UPDATE_ERROR')]);
    });
});
