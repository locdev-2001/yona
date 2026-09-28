import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import StickerMcpTokens from './StickerMcpTokens';
import { AI_ASSISTANTS, findAiAssistant } from './aiAssistants';
import type { StickerMcpTokensApi } from './stickerMcpTokensApi';
import type { StickerMcpToken, StickerMcpTokenScope } from './types';

const MCP_URL = 'https://yona.vn/mcp/stickers';
const PLAIN_TOKEN = 'yst_bi-mat-chi-hien-mot-lan';
const SKILL_URL = '/api/v1/accounts/1/sticker_library_skill';
const SKILL_META = { name: 'yona-sticker-pack', prompt: 'design_sticker_pack' };

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
        listTokens: vi.fn().mockResolvedValue({ payload: tokens, meta: { usable_scopes: usableScopes, mcp_url: MCP_URL, skill: SKILL_META } }),
        createToken: vi.fn().mockImplementation((name: string, scope: StickerMcpTokenScope) =>
            Promise.resolve({ ...listedToken({ id: 9, name, scope }), token: PLAIN_TOKEN, mcp_url: MCP_URL }),
        ),
        revokeToken: vi.fn().mockResolvedValue(null),
        skillDownloadUrl: SKILL_URL,
        ...overrides,
    };
}

const claudeSetup = (token: string) => findAiAssistant('claude_code').mcpSetup(MCP_URL, token);

describe('cách nối MCP của từng trợ lý AI', () => {
    it('Claude Code: lệnh claude mcp add với header Bearer', () => {
        expect(claudeSetup('yst_abc')).toBe(
            'claude mcp add --transport http yona-stickers https://yona.vn/mcp/stickers --header "Authorization: Bearer yst_abc"',
        );
    });

    it('Codex: khối config.toml với http_headers Bearer', () => {
        expect(findAiAssistant('codex').mcpSetup(MCP_URL, 'yst_abc')).toBe(
            '[mcp_servers.yona-stickers]\nurl = "https://yona.vn/mcp/stickers"\nhttp_headers = { Authorization = "Bearer yst_abc" }',
        );
    });

    it('trợ lý khác: JSON mcpServers dùng url và headers', () => {
        expect(JSON.parse(findAiAssistant('other').mcpSetup(MCP_URL, 'yst_abc'))).toEqual({
            mcpServers: { 'yona-stickers': { url: MCP_URL, headers: { Authorization: 'Bearer yst_abc' } } },
        });
    });

    it('mỗi trợ lý có id riêng', () => {
        expect(new Set(AI_ASSISTANTS.map(assistant => assistant.id)).size).toBe(AI_ASSISTANTS.length);
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
        expect(screen.getByText(claudeSetup(PLAIN_TOKEN))).toBeInTheDocument();
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
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Chép Claude Code: Chạy lệnh này trong terminal' })));

        expect(writeText).toHaveBeenCalledWith(claudeSetup(PLAIN_TOKEN));
    });

    it('chọn trợ lý khác thì đổi cách nối MCP và thư mục cài skill theo trợ lý đó', async () => {
        render(<StickerMcpTokens api={fakeApi(['account'])} />);

        fireEvent.change(await screen.findByLabelText('Tên token'), { target: { value: 'AI' } });
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Tạo token' })));
        fireEvent.click(screen.getByRole('radio', { name: 'Codex' }));

        expect(screen.getByRole('radio', { name: 'Codex' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByText('Codex: Dán vào tệp ~/.codex/config.toml')).toBeInTheDocument();
        expect(screen.getByText('~/.codex/skills/yona-sticker-pack/').tagName).toBe('CODE');
        expect(screen.queryByText(claudeSetup(PLAIN_TOKEN))).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', { name: 'Trợ lý khác' }));

        expect(screen.getByText(/mcpServers/, { selector: 'code' })).toBeInTheDocument();
        expect(screen.getByText('yona-sticker-pack', { selector: 'code' })).toBeInTheDocument();
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

    it('liệt kê token với phạm vi và lần dùng, thu hồi sau khi xác nhận trong hộp thoại', async () => {
        const api = fakeApi(['account'], [listedToken()]);
        render(<StickerMcpTokens api={api} />);

        expect(await screen.findByText('Claude của Lan')).toBeInTheDocument();
        expect(screen.getByText(/Kho riêng của account · Tạo bởi Lan · Chưa dùng lần nào/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Thu hồi Claude của Lan' }));

        const dialog = screen.getByRole('alertdialog', { name: 'Thu hồi token MCP' });
        expect(dialog).toHaveTextContent('Thu hồi token “Claude của Lan”? AI đang dùng token này sẽ mất quyền ngay.');
        expect(api.revokeToken).not.toHaveBeenCalled();

        await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Thu hồi' })));

        expect(api.revokeToken).toHaveBeenCalledWith(5);
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(screen.queryByText('Claude của Lan')).not.toBeInTheDocument();
        expect(screen.getByText('Chưa có token nào.')).toBeInTheDocument();
        expect(toasts).toContain('Đã thu hồi token');
    });

    it('huỷ hộp xác nhận thì không thu hồi', async () => {
        const api = fakeApi(['account'], [listedToken()]);
        render(<StickerMcpTokens api={api} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi Claude của Lan' }));
        fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Huỷ' }));

        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(api.revokeToken).not.toHaveBeenCalled();
        expect(screen.getByText('Claude của Lan')).toBeInTheDocument();
    });

    it('thẻ Skill cho AI có nút tải SKILL.md và chỉ cách dùng theo tên skill, tên prompt của máy chủ', async () => {
        render(<StickerMcpTokens api={fakeApi(['account'])} />);

        const download = await screen.findByRole('link', { name: 'Tải SKILL.md' });
        expect(download).toHaveAttribute('href', SKILL_URL);
        expect(download).toHaveAttribute('download');
        expect(screen.getByText('Skill cho AI')).toBeInTheDocument();
        expect(screen.getByText('Dạy trợ lý AI cách vẽ cả bộ sticker đồng bộ một nhân vật.')).toBeInTheDocument();
        expect(screen.getByText('~/.claude/skills/yona-sticker-pack/').tagName).toBe('CODE');
        expect(screen.getByText('design_sticker_pack').tagName).toBe('CODE');
    });

    it('tải danh sách hỏng thì báo lỗi và thử lại được', async () => {
        const listTokens = vi
            .fn()
            .mockRejectedValueOnce(new Error('mạng'))
            .mockResolvedValueOnce({ payload: [], meta: { usable_scopes: ['account'], mcp_url: MCP_URL, skill: SKILL_META } });
        render(<StickerMcpTokens api={fakeApi(['account'], [], { listTokens })} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));

        await waitFor(() => expect(screen.getByText('Chưa có token nào.')).toBeInTheDocument());
    });
});
