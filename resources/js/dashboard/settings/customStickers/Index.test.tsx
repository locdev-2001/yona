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
    default: ({ api }: { api: { baseUrl: string } }) => {
        libraryApiBases.push(api.baseUrl);

        return <div data-testid="library-manager">{api.baseUrl}</div>;
    },
}));
vi.mock('./StickerMcpTokens', () => ({ default: () => <div data-testid="mcp-tokens" /> }));

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
});

const tabNames = () => screen.getAllByRole('button').map(button => button.textContent?.trim());

describe('trang Cài đặt / Kho sticker', () => {
    it('chưa có quyền: kho riêng và MCP hiện trạng thái khoá, không có kho nền tảng, không có nút giả', () => {
        pageProps.stickerLibraryAccess = { accountLibrary: false, platformLibrary: false };
        render(<CustomStickersIndex />);

        expect(tabNames()).toEqual(['Kho riêng', 'MCP cho AI']);
        expect(screen.getByRole('note')).toHaveTextContent('Chưa mở cho account này');
        expect(screen.queryByTestId('library-manager')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'MCP cho AI' }));

        expect(screen.getByRole('note')).toHaveTextContent('Token MCP cho AI chỉ tạo được');
        expect(screen.queryByTestId('mcp-tokens')).not.toBeInTheDocument();
    });

    it('account dùng được kho riêng: hiện trình quản lý kho riêng và khối MCP', () => {
        pageProps.stickerLibraryAccess = { accountLibrary: true, platformLibrary: false };
        render(<CustomStickersIndex />);

        expect(screen.getByTestId('library-manager')).toHaveTextContent('/api/v1/accounts/7');
        expect(tabNames()).not.toContain('Kho nền tảng');

        fireEvent.click(screen.getByRole('button', { name: 'MCP cho AI' }));

        expect(screen.getByTestId('mcp-tokens')).toBeInTheDocument();
        expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('có quyền hệ thống: thêm tab kho nền tảng trỏ vào API kho nền tảng', () => {
        pageProps.stickerLibraryAccess = { accountLibrary: true, platformLibrary: true };
        render(<CustomStickersIndex />);

        fireEvent.click(screen.getByRole('button', { name: 'Kho nền tảng' }));

        expect(screen.getByTestId('library-manager')).toHaveTextContent(PLATFORM_STICKER_LIBRARY_API_BASE);
    });
});
