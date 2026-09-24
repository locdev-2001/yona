import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Khởi động thật của widget (main.tsx): đọc URL iframe, khôi phục token rồi POST /config.
// /config trả 404 để luồng dừng ngay sau yêu cầu đầu tiên, test chỉ đọc header gửi đi.

const WEBSITE_TOKEN = 'website-token';

const storeVisitorSession = (session: Record<string, string>) =>
    window.localStorage.setItem(`widget_session:${WEBSITE_TOKEN}`, JSON.stringify(session));

const bootstrapWidget = async (search: string): Promise<Headers> => {
    window.history.replaceState(null, '', `/widget${search}`);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await import('./main');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/widget/config');

    return new Headers(init.headers);
};

beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
});

// Lần import đầu phải biên dịch cả cây App; khi chạy chung cả bộ test, việc đó có thể quá 5 giây.
describe('widget khởi động', { timeout: 30000 }, () => {
    it('URL iframe mang cw_conversation thì /config gửi đúng token đó', async () => {
        const headers = await bootstrapWidget(`?website_token=${WEBSITE_TOKEN}&cw_conversation=cookie-token`);

        expect(headers.get('X-Auth-Token')).toBe('cookie-token');
    });

    it('URL không mang token nhưng widget đã lưu token thì dùng token đã lưu', async () => {
        storeVisitorSession({ authToken: 'stored-token' });

        const headers = await bootstrapWidget(`?website_token=${WEBSITE_TOKEN}`);

        expect(headers.get('X-Auth-Token')).toBe('stored-token');
    });

    it('SDK dựng lại iframe với cờ phiên mới thì /config không gửi token và token đã lưu bị xoá', async () => {
        storeVisitorSession({ authToken: 'stored-token' });

        const headers = await bootstrapWidget(`?website_token=${WEBSITE_TOKEN}&new_session=reset-1`);

        expect(headers.has('X-Auth-Token')).toBe(false);
        expect(JSON.parse(window.localStorage.getItem(`widget_session:${WEBSITE_TOKEN}`)!)).toEqual({
            resetId: 'reset-1',
        });
    });
});
