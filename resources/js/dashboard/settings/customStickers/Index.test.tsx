import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import CustomStickersIndex, { PLATFORM_STICKER_LIBRARY_API_BASE } from './Index';
import type { StickerLibraryAccess } from './types';

const pageProps: { stickerLibraryAccess: StickerLibraryAccess } = {
    stickerLibraryAccess: { accountLibrary: false, platformLibrary: false },
};
const libraryApiBases: string[] = [];

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 7 }, ...pageProps } }),
}));
vi.mock('../../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../SettingsWrapper', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../BaseSettingsHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('./stickerLibraryApi', () => ({
    createStickerLibraryApi: (baseUrl: string) => ({ baseUrl }),
}));
vi.mock('./StickerLibraryManager', () => ({
    PACK_QUERY_KEY: 'pack',
    default: ({ api }: { api: { baseUrl: string } }) => {
        libraryApiBases.push(api.baseUrl);

        return <div data-testid="library-manager">{api.baseUrl}</div>;
    },
}));

class ResizeObserverStub {
    observe() {}
    disconnect() {}
}

beforeAll(() => {
    setLocale('vi');
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});
afterAll(() => {
    setLocale('en');
    vi.unstubAllGlobals();
});
beforeEach(() => {
    libraryApiBases.length = 0;
    window.history.replaceState(null, '', '/app/accounts/7/settings/stickers');
});

const tabNames = () => screen.queryAllByRole('button').map(button => button.textContent?.trim());

describe('trang Cài đặt / Kho sticker', () => {
    it('chưa có quyền: kho riêng hiện trạng thái khoá, không có kho nền tảng, không có nút giả', () => {
        pageProps.stickerLibraryAccess = { accountLibrary: false, platformLibrary: false };
        render(<CustomStickersIndex />);

        expect(tabNames()).toEqual([]);
        expect(screen.getByRole('note')).toHaveTextContent('Chưa mở cho tài khoản này');
        expect(screen.queryByTestId('library-manager')).not.toBeInTheDocument();
    });

    it('chỉ có một kho thì không hiện thanh tab, hiện thẳng trình quản lý kho riêng', () => {
        pageProps.stickerLibraryAccess = { accountLibrary: true, platformLibrary: false };
        render(<CustomStickersIndex />);

        expect(tabNames()).toEqual([]);
        expect(screen.getByTestId('library-manager')).toHaveTextContent('/api/v1/accounts/7');
        expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('có quyền hệ thống: thêm tab kho nền tảng trỏ vào API kho nền tảng', () => {
        pageProps.stickerLibraryAccess = { accountLibrary: true, platformLibrary: true };
        render(<CustomStickersIndex />);

        fireEvent.click(screen.getByRole('button', { name: 'Kho nền tảng' }));

        expect(screen.getByTestId('library-manager')).toHaveTextContent(PLATFORM_STICKER_LIBRARY_API_BASE);
    });

    it('tab đang mở ghi vào ?tab= và mở lại đúng tab khi tải lại trang', () => {
        pageProps.stickerLibraryAccess = { accountLibrary: true, platformLibrary: true };
        window.history.replaceState(null, '', '/app/accounts/7/settings/stickers?pack=3');
        const { unmount } = render(<CustomStickersIndex />);

        fireEvent.click(screen.getByRole('button', { name: 'Kho nền tảng' }));
        expect(window.location.search).toBe('?tab=platform');
        unmount();

        render(<CustomStickersIndex />);
        expect(screen.getByTestId('library-manager')).toHaveTextContent(PLATFORM_STICKER_LIBRARY_API_BASE);

        fireEvent.click(screen.getByRole('button', { name: 'Kho riêng' }));
        expect(window.location.search).toBe('');
    });

    it.each(['platform', 'unknown'])('?tab=%s không có quyền hoặc lạ thì mở kho riêng', requestedTab => {
        pageProps.stickerLibraryAccess = { accountLibrary: true, platformLibrary: false };
        window.history.replaceState(null, '', `/app/accounts/7/settings/stickers?tab=${requestedTab}`);
        render(<CustomStickersIndex />);

        expect(screen.getByTestId('library-manager')).toHaveTextContent('/api/v1/accounts/7');
    });
});
