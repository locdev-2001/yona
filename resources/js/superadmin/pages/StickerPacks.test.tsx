import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { installDomStubs } from '../components/__fixtures__/dom';

const routerVisit = vi.fn();
const api = vi.hoisted(() => ({
    getJson: vi.fn(),
    postJson: vi.fn(),
    patchJson: vi.fn(),
    putJson: vi.fn(),
    deleteJson: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
    router: { visit: (...args: unknown[]) => routerVisit(...args), get: vi.fn() },
    usePage: () => ({ props: {} }),
}));

vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    ...api,
}));

import AccountStickerLibrary from '@admin/views/stickers/AccountStickerLibrary';
import type { LibrarySticker, LibraryStickerPackDetail } from 'dashboard/settings/customStickers/types';
import StickerPacks from './StickerPacks';

const sticker = (overrides: Partial<LibrarySticker> = {}): LibrarySticker => ({
    id: 11,
    label: 'Mèo vẫy',
    keywords: ['chào'],
    status: 'ready',
    failure_message: null,
    position: 1,
    width: 256,
    height: 256,
    frames: 1,
    image_url: '/stickers/11.webp',
    static_url: '/stickers/11.png',
    edit: null,
    has_original: true,
    ...overrides,
});

const pack = (overrides: Partial<LibraryStickerPackDetail> = {}): LibraryStickerPackDetail => ({
    id: 5,
    name: 'Mèo con',
    published: false,
    published_at: null,
    stickers_count: 1,
    cover_url: '/stickers/11.webp',
    stickers: [sticker()],
    ...overrides,
});

const listing = (packs: LibraryStickerPackDetail[]) => ({
    payload: packs.map(({ stickers: _stickers, ...summary }) => summary),
    meta: { max_upload_kb: 512, accepted_extensions: ['png', 'webp'], image_size: 160 },
});

// Menu của base-ui chọn mục theo chuỗi sự kiện con trỏ đầy đủ.
function choose(item: HTMLElement) {
    fireEvent.pointerDown(item, { pointerType: 'mouse' });
    fireEvent.mouseDown(item);
    fireEvent.pointerUp(item, { pointerType: 'mouse' });
    fireEvent.mouseUp(item);
    fireEvent.click(item);
}

async function openPackMenu() {
    fireEvent.click(screen.getByRole('button', { name: 'Pack options' }));

    return screen.findByRole('menu');
}

describe('StickerPacks', () => {
    beforeAll(() => installDomStubs());

    beforeEach(() => {
        window.history.replaceState(null, '', '/admin/sticker_packs');
        Object.values(api).forEach(mock => mock.mockReset());
        routerVisit.mockReset();
    });

    afterEach(() => vi.useRealTimers());

    it('kho chung: liệt kê bộ, mở bộ đầu, không có mục chuyển kho', async () => {
        api.getJson.mockImplementation(async (url: string) => (url.endsWith('/sticker_packs') ? listing([pack()]) : pack()));

        render(<StickerPacks apiBaseUrl="/admin/api" />);

        expect(await screen.findByRole('heading', { name: 'Mèo con' })).toBeInTheDocument();
        expect(api.getJson).toHaveBeenCalledWith('/admin/api/sticker_packs');
        expect(api.getJson).toHaveBeenCalledWith('/admin/api/sticker_packs/5');
        expect(screen.getByRole('option', { name: /Mèo vẫy/ })).toBeInTheDocument();

        const menu = await openPackMenu();
        expect(within(menu).queryByText('Move to platform library')).toBeNull();
    });

    it('tạo bộ mới qua hộp đặt tên', async () => {
        const created = pack({ id: 9, name: 'Chó con', stickers: [], cover_url: null, stickers_count: 0 });
        let packs: LibraryStickerPackDetail[] = [];
        api.getJson.mockImplementation(async (url: string) => (url.endsWith('/sticker_packs') ? listing(packs) : created));
        api.postJson.mockImplementation(async () => {
            packs = [created];

            return created;
        });

        render(<StickerPacks apiBaseUrl="/admin/api" />);

        fireEvent.click(await screen.findByRole('button', { name: 'Create the first pack' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('Pack name'), { target: { value: 'Chó con' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

        await waitFor(() => expect(api.postJson).toHaveBeenCalledWith('/admin/api/sticker_packs', { name: 'Chó con' }));
        expect(await screen.findByRole('heading', { name: 'Chó con' })).toBeInTheDocument();
    });

    it('bật xuất bản gọi API publish', async () => {
        api.getJson.mockImplementation(async (url: string) => (url.endsWith('/sticker_packs') ? listing([pack()]) : pack()));
        api.postJson.mockResolvedValue(pack({ published: true, published_at: '2026-10-01T00:00:00Z' }));

        render(<StickerPacks apiBaseUrl="/admin/api" />);

        fireEvent.click(await screen.findByRole('switch'));

        await waitFor(() => expect(api.postJson).toHaveBeenCalledWith('/admin/api/sticker_packs/5/publish', {}));
        expect(await screen.findAllByText('Published')).not.toHaveLength(0);
    });

    it('sửa nhãn sticker trong ngăn chi tiết', async () => {
        api.getJson.mockImplementation(async (url: string) => (url.endsWith('/sticker_packs') ? listing([pack()]) : pack()));
        api.patchJson.mockResolvedValue(sticker({ label: 'Mèo chào' }));

        render(<StickerPacks apiBaseUrl="/admin/api" />);

        fireEvent.click(await screen.findByRole('option', { name: /Mèo vẫy/ }));
        const sheet = await screen.findByRole('dialog');
        fireEvent.change(within(sheet).getByLabelText('Label'), { target: { value: 'Mèo chào' } });
        fireEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(api.patchJson).toHaveBeenCalledWith('/admin/api/sticker_packs/5/stickers/11', { label: 'Mèo chào', keywords: ['chào'] }),
        );
    });

    it('xoá sticker hỏi lại rồi gọi API', async () => {
        api.getJson.mockImplementation(async (url: string) => (url.endsWith('/sticker_packs') ? listing([pack()]) : pack()));
        api.deleteJson.mockResolvedValue(undefined);

        render(<StickerPacks apiBaseUrl="/admin/api" />);

        const tile = await screen.findByRole('option', { name: /Mèo vẫy/ });
        fireEvent.keyDown(tile, { key: 'Delete' });
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete sticker' }));

        await waitFor(() => expect(api.deleteJson).toHaveBeenCalledWith('/admin/api/sticker_packs/5/stickers/11'));
        await waitFor(() => expect(screen.queryByRole('option', { name: /Mèo vẫy/ })).toBeNull());
    });

    it('kéo về đầu lưu thứ tự mới sau khi dừng', async () => {
        const second = sticker({ id: 12, label: 'Mèo ngủ', position: 2 });
        api.getJson.mockImplementation(async (url: string) =>
            url.endsWith('/sticker_packs') ? listing([pack({ stickers: [sticker(), second] })]) : pack({ stickers: [sticker(), second] }),
        );
        api.putJson.mockResolvedValue(pack({ stickers: [second, sticker()] }));

        render(<StickerPacks apiBaseUrl="/admin/api" />);

        const tile = await screen.findByRole('option', { name: /Mèo ngủ/ });
        const menuButton = within(tile.parentElement!).getByRole('button', { name: 'Sticker options' });
        fireEvent.click(menuButton);
        choose(await screen.findByRole('menuitem', { name: 'Move to top' }));

        await waitFor(() => expect(api.putJson).toHaveBeenCalledWith('/admin/api/sticker_packs/5/stickers/order', { sticker_ids: [12, 11] }), {
            timeout: 2000,
        });
    });

    it('kho của account: chuyển bộ sang kho chung qua API của account', async () => {
        api.getJson.mockImplementation(async (url: string) => (url.endsWith('/sticker_packs') ? listing([pack()]) : pack()));
        api.postJson.mockResolvedValue(pack());

        render(<AccountStickerLibrary accountId={7} />);

        await screen.findByRole('heading', { name: 'Mèo con' });
        expect(api.getJson).toHaveBeenCalledWith('/admin/api/accounts/7/sticker_packs');

        const menu = await openPackMenu();
        choose(within(menu).getByRole('menuitem', { name: 'Move to platform library' }));
        const dialog = await screen.findByRole('dialog');
        await act(async () => {
            fireEvent.click(within(dialog).getByRole('button', { name: 'Move to platform library' }));
        });

        await waitFor(() =>
            expect(api.postJson).toHaveBeenCalledWith('/admin/api/accounts/7/sticker_packs/5/move', { library: 'platform' }),
        );
    });

    it('trang kho account: tab kho chung quay về kho chung', async () => {
        api.getJson.mockImplementation(async (url: string) => (url.endsWith('/sticker_packs') ? listing([]) : pack()));

        render(
            <StickerPacks
                apiBaseUrl="/admin/api/accounts/7"
                account={{ id: 7, name: 'Shop Hoa', overviewUrl: '/admin/accounts/7/overview' }}
                platformUrl="/admin/sticker_packs"
            />,
        );

        expect(screen.getByRole('link', { name: 'Back to account' })).toHaveAttribute('href', '/admin/accounts/7/overview');
        fireEvent.click(screen.getByRole('tab', { name: 'Shared library' }));

        expect(routerVisit).toHaveBeenCalledWith('/admin/sticker_packs');
    });
});
