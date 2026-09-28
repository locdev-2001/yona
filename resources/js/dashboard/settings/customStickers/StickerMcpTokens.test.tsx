import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import StickerMcpTokens from './StickerMcpTokens';
import { claudeMcpAddCommand } from './stickerMcpTokensApi';
import type { StickerMcpTokensApi } from './stickerMcpTokensApi';
import type { StickerMcpToken, StickerMcpTokenScope } from './types';

const MCP_URL = 'https://yona.vn/mcp/stickers';
const PLAIN_TOKEN = 'yst_bi-mat-chi-hien-mot-lan';

const toasts: string[] = [];
const collectToast = (payload: unknown) => toasts.push((payload as { message: string }).message);

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));
beforeEach(() => {
    toasts.length = 0;
    emitter.on(BUS_EVENTS.SHOW_TOAST, collectToast);
});
afterEach(() => {
    emitter.off(BUS_EVENTS.SHOW_TOAST, collectToast);
    vi.restoreAllMocks();
});

const listedToken = (overrides: Partial<StickerMcpToken> = {}): StickerMcpToken => ({
    id: 5,
    name: 'Claude của Lan',
    scope: 'account',
    created_by: 'Lan',
    created_at: '2026-09-28T08:00:00+07:00',
    last_used_at: null,
    ...overrides,
});

function fakeApi(usableScopes: StickerMcpTokenScope[], tokens: StickerMcpToken[] = [], overrides: Partial<StickerMcpTokensApi> = {}): StickerMcpTokensApi {
    return {
        listTokens: vi.fn().mockResolvedValue({ payload: tokens, meta: { usable_scopes: usableScopes, mcp_url: MCP_URL } }),
        createToken: vi.fn().mockImplementation((name: string, scope: StickerMcpTokenScope) =>
            Promise.resolve({ ...listedToken({ id: 9, name, scope }), token: PLAIN_TOKEN, mcp_url: MCP_URL }),
        ),
        revokeToken: vi.fn().mockResolvedValue(null),
        ...overrides,
    };
}

describe('lệnh thêm MCP', () => {
    it('dựng đúng lệnh claude mcp add với header Bearer', () => {
        expect(claudeMcpAddCommand(MCP_URL, 'yst_abc')).toBe(
            'claude mcp add --transport http yona-stickers https://yona.vn/mcp/stickers --header "Authorization: Bearer yst_abc"',
        );
    });
});

describe('khối MCP cho AI', () => {
    it('tạo token: hiện token và lệnh đúng một lần, đóng lại thì token thô biến mất khỏi trang', async () => {
        const api = fakeApi(['account']);
        render(<StickerMcpTokens api={api} />);

        fireEvent.change(await screen.findByLabelText('Tên token'), { target: { value: '  Claude của Lan  ' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Tạo token' })));

        expect(api.createToken).toHaveBeenCalledWith('Claude của Lan', 'account');
        expect(screen.getByText(PLAIN_TOKEN)).toBeInTheDocument();
        expect(screen.getByText(claudeMcpAddCommand(MCP_URL, PLAIN_TOKEN))).toBeInTheDocument();
        expect(screen.getByText('Claude của Lan')).toBeInTheDocument();
        expect(screen.getByLabelText('Tên token')).toHaveValue('');

        fireEvent.click(screen.getByRole('button', { name: 'Đã chép xong' }));

        expect(screen.queryByText(PLAIN_TOKEN)).not.toBeInTheDocument();
        expect(document.body.textContent).not.toContain(PLAIN_TOKEN);
        expect(screen.getByText('Claude của Lan')).toBeInTheDocument();
    });

    it('nút chép đưa lệnh vào clipboard', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });
        render(<StickerMcpTokens api={fakeApi(['account'])} />);

        fireEvent.change(await screen.findByLabelText('Tên token'), { target: { value: 'AI' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Tạo token' })));
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Chép Lệnh thêm vào Claude Code' })));

        expect(writeText).toHaveBeenCalledWith(claudeMcpAddCommand(MCP_URL, PLAIN_TOKEN));
    });

    it('chỉ có một phạm vi thì không hiện ô chọn; có cả kho nền tảng thì chọn được', async () => {
        const { unmount } = render(<StickerMcpTokens api={fakeApi(['account'])} />);
        await screen.findByLabelText('Tên token');
        expect(screen.queryByLabelText('Kho được chạm')).not.toBeInTheDocument();
        unmount();

        const api = fakeApi(['account', 'platform']);
        render(<StickerMcpTokens api={api} />);
        fireEvent.change(await screen.findByLabelText('Kho được chạm'), { target: { value: 'platform' } });
        fireEvent.change(screen.getByLabelText('Tên token'), { target: { value: 'Nền tảng' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Tạo token' })));

        expect(api.createToken).toHaveBeenCalledWith('Nền tảng', 'platform');
    });

    it('liệt kê token với phạm vi và lần dùng, thu hồi sau khi xác nhận', async () => {
        const api = fakeApi(['account'], [listedToken()]);
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<StickerMcpTokens api={api} />);

        expect(await screen.findByText('Claude của Lan')).toBeInTheDocument();
        expect(screen.getByText(/Kho riêng của account · Tạo bởi Lan · Chưa dùng lần nào/)).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Thu hồi Claude của Lan' })));

        expect(confirm).toHaveBeenCalled();
        expect(api.revokeToken).toHaveBeenCalledWith(5);
        expect(screen.queryByText('Claude của Lan')).not.toBeInTheDocument();
        expect(screen.getByText('Chưa có token nào.')).toBeInTheDocument();
        expect(toasts).toContain('Đã thu hồi token');
    });

    it('huỷ hộp xác nhận thì không thu hồi', async () => {
        const api = fakeApi(['account'], [listedToken()]);
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        render(<StickerMcpTokens api={api} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi Claude của Lan' }));

        expect(api.revokeToken).not.toHaveBeenCalled();
        expect(screen.getByText('Claude của Lan')).toBeInTheDocument();
    });

    it('tải danh sách hỏng thì báo lỗi và thử lại được', async () => {
        const listTokens = vi
            .fn()
            .mockRejectedValueOnce(new Error('mạng'))
            .mockResolvedValueOnce({ payload: [], meta: { usable_scopes: ['account'], mcp_url: MCP_URL } });
        render(<StickerMcpTokens api={fakeApi(['account'], [], { listTokens })} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));

        await waitFor(() => expect(screen.getByText('Chưa có token nào.')).toBeInTheDocument());
    });
});
